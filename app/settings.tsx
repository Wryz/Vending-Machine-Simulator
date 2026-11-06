import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';

import { VOLUME_STEPS } from '@/config/audio';
import { track } from '@/services/analytics';
import { sound } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { requestNotificationPermission, rescheduleNotifications } from '@/services/notifications';
import { readUri, writeShareFile } from '@/services/storage';
import { SaveError, exportSave, importSave } from '@/sim';
import { useGame } from '@/store/game';
import { useProfile, type Settings } from '@/store/profile';
import { useTheme } from '@/ui/ThemeProvider';
import { Button, Divider, Mono, Paper, Row, Screen, Section, T } from '@/ui/kit';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { SPACE, TOUCH } from '@/ui/theme';

function Toggle({
  label,
  detail,
  value,
  onChange,
  disabled,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Row
      style={{ minHeight: TOUCH + 8, paddingVertical: SPACE.xs, opacity: disabled ? 0.5 : 1 }}
      gap={SPACE.m}
    >
      <View style={{ flex: 1 }}>
        <T weight="medium">{label}</T>
        {detail ? (
          <T size={13} muted>
            {detail}
          </T>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={detail}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: theme.signal, false: theme.line }}
      />
    </Row>
  );
}

function Choice({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      accessibilityHint={detail}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: TOUCH + 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACE.m,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: selected ? theme.ink : theme.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? (
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.ink }} />
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <T weight="medium">{label}</T>
        <T size={13} muted>
          {detail}
        </T>
      </View>
    </Pressable>
  );
}

/** Volume as five steps (0/25/50/75/100). Adjustable for VoiceOver. */
function Level({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  // Nearest step, so older or odd saved values still show a selection.
  const index = VOLUME_STEPS.reduce(
    (best, v, i) => (Math.abs(v - value) < Math.abs(VOLUME_STEPS[best] - value) ? i : best),
    0,
  );
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const go = (i: number) => {
    const j = Math.min(VOLUME_STEPS.length - 1, Math.max(0, i));
    if (j !== index) onChange(VOLUME_STEPS[j]);
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: VOLUME_STEPS[index] === 0 ? 'Off' : pct(VOLUME_STEPS[index]) }}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (disabled) return;
        if (e.nativeEvent.actionName === 'increment') go(index + 1);
        if (e.nativeEvent.actionName === 'decrement') go(index - 1);
      }}
      style={{ paddingVertical: SPACE.xs, gap: SPACE.xs, opacity: disabled ? 0.5 : 1 }}
    >
      <T weight="medium">{label}</T>
      <Row gap={SPACE.xs}>
        {VOLUME_STEPS.map((v, i) => {
          const selected = i === index;
          return (
            <Pressable
              key={v}
              disabled={disabled}
              importantForAccessibility="no"
              onPress={() => go(i)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: TOUCH,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: selected ? theme.ink : theme.line,
                backgroundColor: selected ? theme.ink : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <T
                size={13}
                weight={selected ? 'medium' : 'regular'}
                color={selected ? theme.bg : theme.muted}
              >
                {v === 0 ? 'Off' : String(Math.round(v * 100))}
              </T>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

/** Settings (SPEC §8, §10, §11). */
export default function SettingsScreen() {
  const settings = useProfile((s) => s.settings);
  const setSettings = useProfile((s) => s.setSettings);
  const game = useGame((s) => s.game);
  const city = useGame((s) => s.city);
  const { flash, show } = useFlash();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const setNotifications = (patch: Partial<Settings['notifications']>) => {
    setSettings({ notifications: { ...useProfile.getState().settings.notifications, ...patch } });
    const { game: g, world } = useGame.getState();
    rescheduleNotifications(g, world).catch(() => undefined);
  };

  const toggleNotifications = async (on: boolean) => {
    if (!on) {
      setNotifications({ enabled: false });
      return;
    }
    const granted = await requestNotificationPermission().catch(() => false);
    if (granted) {
      setNotifications({ enabled: true });
      track('notifications', { ok: true });
    } else {
      show('Notifications are turned off for Coinline in the Settings app.', 'info');
    }
  };

  const togglePersonalizedAds = async (on: boolean) => {
    if (!on) {
      setSettings({ personalizedAds: false });
      return;
    }
    const res = await requestTrackingPermissionsAsync().catch(() => null);
    if (res?.granted) setSettings({ personalizedAds: true });
    else show('Tracking not allowed. Ads stay non-personalized.', 'info');
  };

  const doExport = async () => {
    if (!game) return;
    setBusy('export');
    try {
      const date = new Date().toISOString().slice(0, 10);
      const uri = writeShareFile(`coinline-${game.cityId}-${date}.json`, exportSave(game));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          UTI: 'public.json',
          dialogTitle: 'Export save',
        });
      } else {
        show('Sharing is not available on this device.', 'error');
      }
    } catch {
      show('Could not export the save.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    const current = useGame.getState().city;
    if (!current || !useGame.getState().game) {
      show('Open a city first, then import its save.', 'info');
      return;
    }
    setBusy('import');
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const imported = importSave(await readUri(picked.assets[0].uri));
      if (imported.cityId !== current.id) {
        show('That save is for another city. Switch to it first.', 'error');
        return;
      }
      Alert.alert(
        'Replace this save?',
        `Your business in ${current.name} will be replaced by the imported save.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              useGame.getState().replaceGame(imported);
              haptic.success();
              show('Save imported.', 'success');
            },
          },
        ],
      );
    } catch (e) {
      haptic.error();
      show(e instanceof SaveError ? e.message : 'Could not read that file.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={{ flex: 1 }}>
      <Screen title="Settings">
        <Section title="Sound">
          <Paper tone="surface" style={{ paddingVertical: SPACE.s, gap: SPACE.s }}>
            <Toggle
              label="Sound"
              detail="Music, clicks and coins, and the city around you"
              value={settings.sound}
              onChange={(v) => setSettings({ sound: v })}
            />
            <Divider />
            <Level
              label="Music"
              value={settings.musicVolume}
              disabled={!settings.sound}
              onChange={(v) => setSettings({ musicVolume: v })}
            />
            <Level
              label="Effects"
              value={settings.sfxVolume}
              disabled={!settings.sound}
              onChange={(v) => {
                setSettings({ sfxVolume: v });
                sound.play('pop');
              }}
            />
            <Level
              label="City ambience"
              value={settings.ambienceVolume}
              disabled={!settings.sound}
              onChange={(v) => setSettings({ ambienceVolume: v })}
            />
          </Paper>
          <T size={13} muted>
            Follows the silent switch.
          </T>
        </Section>

        <Section title="Feel">
          <Paper tone="surface" style={{ paddingVertical: SPACE.s }}>
            <Toggle
              label="Haptics"
              detail="Coin ticks and product thunks"
              value={settings.haptics}
              onChange={(v) => setSettings({ haptics: v })}
            />
          </Paper>
        </Section>

        <Section title="Notifications">
          <Paper tone="surface" style={{ paddingVertical: SPACE.s }}>
            <Toggle
              label="Notifications"
              detail="At most 3 a day, never 22:00–08:00"
              value={settings.notifications.enabled}
              onChange={toggleNotifications}
            />
            <Divider />
            <Toggle
              label="Machine empty"
              value={settings.notifications.empty}
              disabled={!settings.notifications.enabled}
              onChange={(v) => setNotifications({ empty: v })}
            />
            <Toggle
              label="Cash box full"
              value={settings.notifications.cashFull}
              disabled={!settings.notifications.enabled}
              onChange={(v) => setNotifications({ cashFull: v })}
            />
            <Toggle
              label="Local events nearby"
              value={settings.notifications.events}
              disabled={!settings.notifications.enabled}
              onChange={(v) => setNotifications({ events: v })}
            />
          </Paper>
        </Section>

        <Section title="Look">
          <Paper tone="surface" style={{ paddingVertical: SPACE.s }}>
            <View accessibilityRole="radiogroup">
              <Choice
                label="Bright"
                detail="Bright menus all day; the map still follows your city's time"
                selected={settings.theme === 'city'}
                onPress={() => setSettings({ theme: 'city' })}
              />
              <Choice
                label="System"
                detail="Match your phone's light or dark setting"
                selected={settings.theme === 'system'}
                onPress={() => setSettings({ theme: 'system' })}
              />
            </View>
          </Paper>
        </Section>

        <Section title="Privacy">
          <Paper tone="surface" style={{ paddingVertical: SPACE.s }}>
            <Toggle
              label="Personalized ads"
              detail="Off by default. Asks for tracking permission."
              value={settings.personalizedAds}
              onChange={togglePersonalizedAds}
            />
            <Divider />
            <Toggle
              label="Anonymous usage stats"
              detail="Event counts only. No location, no place names."
              value={settings.analytics}
              onChange={(v) => setSettings({ analytics: v })}
            />
          </Paper>
          <T size={13} muted>
            Your location is used once, approximately, to build your city. It is never stored on a
            server. Saves stay on this device. Ads are optional rewards you choose to watch.
          </T>
        </Section>

        <Section title="Save">
          <T size={13} muted>
            {city ? `Current save: ${city.name}.` : 'No city open.'} Export a copy for support or as
            a backup.
          </T>
          <Row gap={SPACE.s}>
            <Button
              style={{ flex: 1 }}
              kind="secondary"
              label="Export"
              busy={busy === 'export'}
              disabled={!game || busy !== null}
              onPress={doExport}
            />
            <Button
              style={{ flex: 1 }}
              kind="secondary"
              label="Import"
              busy={busy === 'import'}
              disabled={!game || busy !== null}
              onPress={doImport}
            />
          </Row>
        </Section>

        <Section title="About">
          <Button
            kind="secondary"
            label="Credits and licenses"
            onPress={() => router.push('/credits')}
          />
          <Row style={{ justifyContent: 'space-between' }}>
            <T muted>Coinline · Vending Machine Simulator</T>
            <Mono
              muted
              suppressHighlighting
              accessibilityHint="Long press for diagnostics"
              onLongPress={() => router.push('/diagnostics')}
            >
              v{version}
            </Mono>
          </Row>
        </Section>
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
