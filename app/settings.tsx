import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { VOLUME_STEPS } from '@/config/audio';
import { LINKS } from '@/config/links';
import { LANGUAGES, LANGUAGE_NAMES, useLocale, useT, type Lang } from '@/i18n';
import { content } from '@/i18n/content';
import { simError } from '@/i18n/sim';
import { privacyChoicesAvailable, showPrivacyChoices } from '@/services/ads';
import { track } from '@/services/analytics';
import { sound } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { requestNotificationPermission, rescheduleNotifications } from '@/services/notifications';
import { readUri, writeShareFile } from '@/services/storage';
import { SaveError, exportSave, importSave } from '@/sim';
import { useGame } from '@/store/game';
import { useProfile, type Settings } from '@/store/profile';
import { GameCenterSettings } from '@/ui/GameCenter';
import { useTheme } from '@/ui/ThemeProvider';
import { Icon } from '@/ui/icons';
import { Button, Divider, Mono, Paper, Row, Screen, Section, T } from '@/ui/kit';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { Led, SKIN } from '@/ui/skin';
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
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      accessibilityHint={detail || undefined}
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
        {detail ? (
          <T size={13} muted>
            {detail}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}

/** A settings row showing the current choice that expands into a radio list. */
function PickerRow<K extends string>({
  label,
  value,
  hint,
  title,
  options,
  selected,
  onPick,
}: {
  label: string;
  value: string;
  hint: string;
  title: string;
  options: { key: K; label: string; detail?: string }[];
  selected: K;
  onPick: (key: K) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value }}
        accessibilityHint={hint}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => ({
          minHeight: TOUCH + 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACE.m,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <T weight="medium" style={{ flex: 1 }}>
          {label}
        </T>
        <T muted numberOfLines={1} style={{ flexShrink: 1 }}>
          {value}
        </T>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="chevron" size={16} color={theme.muted} />
        </View>
      </Pressable>
      {open ? (
        <>
          <Divider />
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={title}
            style={{ paddingTop: SPACE.xs }}
          >
            {options.map((o) => (
              <Choice
                key={o.key}
                label={o.label}
                detail={o.detail}
                selected={selected === o.key}
                onPress={() => {
                  setOpen(false);
                  if (o.key !== selected) onPick(o.key);
                }}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** The UI language: "Use phone language" first, then each language in its own name. */
function LanguagePicker() {
  const t = useT();
  const saved = useProfile((s) => s.language);
  const device = useLocale((s) => s.device);
  const chosen: Lang | null = LANGUAGES.find((l) => l === saved) ?? null;
  const system = t('settings.languageSystem', { name: LANGUAGE_NAMES[device] });
  return (
    <PickerRow<Lang | 'system'>
      label={t('settings.language')}
      value={chosen ? t('settings.languageValue', { name: LANGUAGE_NAMES[chosen] }) : system}
      hint={t('settings.languageHint')}
      title={t('settings.languageTitle')}
      options={[
        { key: 'system', label: t('settings.languagePhone'), detail: system },
        ...LANGUAGES.map((code) => ({ key: code, label: LANGUAGE_NAMES[code] })),
      ]}
      selected={chosen ?? 'system'}
      onPick={(key) =>
        useProfile.getState().update((p) => {
          p.language = key === 'system' ? null : key;
        })
      }
    />
  );
}

/** Temperature unit: by the city's country (default), or always °C / °F. */
function TempUnitPicker() {
  const t = useT();
  const unit = useProfile((s) => s.settings.tempUnit);
  const setSettings = useProfile((s) => s.setSettings);
  const labels: Record<Settings['tempUnit'], string> = {
    auto: t('settings.temperature.auto'),
    c: '°C',
    f: '°F',
  };
  return (
    <PickerRow<Settings['tempUnit']>
      label={t('settings.temperature.label')}
      value={labels[unit]}
      hint={t('settings.temperature.hint')}
      title={t('settings.temperature.label')}
      options={[
        { key: 'auto', label: labels.auto, detail: t('settings.temperature.autoDetail') },
        { key: 'c', label: labels.c, detail: t('settings.temperature.celsius') },
        { key: 'f', label: labels.f, detail: t('settings.temperature.fahrenheit') },
      ]}
      selected={unit}
      onPick={(tempUnit) => setSettings({ tempUnit })}
    />
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
  const t = useT();
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
      accessibilityValue={{
        text: VOLUME_STEPS[index] === 0 ? t('settings.sound.offA11y') : pct(VOLUME_STEPS[index]),
      }}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (disabled) return;
        if (e.nativeEvent.actionName === 'increment') go(index + 1);
        if (e.nativeEvent.actionName === 'decrement') go(index - 1);
      }}
      style={{ paddingVertical: SPACE.xs, gap: SPACE.xs, opacity: disabled ? 0.5 : 1 }}
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <T weight="medium">{label}</T>
        <Led size={13} color={index === 0 ? SKIN.ledRed : SKIN.ledGreen}>
          {VOLUME_STEPS[index] === 0 ? t('settings.sound.off') : pct(VOLUME_STEPS[index])}
        </Led>
      </Row>
      {/* An LED level meter: tap a segment to set the level; the first one is off. */}
      <View style={styles.meter}>
        {VOLUME_STEPS.map((v, i) => {
          const lit = i > 0 && i <= index;
          return (
            <Pressable
              key={v}
              disabled={disabled}
              importantForAccessibility="no"
              onPress={() => go(i)}
              hitSlop={4}
              style={[
                styles.segment,
                i === 0
                  ? { backgroundColor: index === 0 ? SKIN.ledRed : '#3A2F3A' }
                  : lit
                    ? {
                        backgroundColor: SKIN.ledGreen,
                        shadowColor: SKIN.ledGreen,
                        shadowOpacity: 0.9,
                        shadowRadius: 5,
                      }
                    : { backgroundColor: '#2C3050' },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Settings (SPEC §8, §10, §11). */
export default function SettingsScreen() {
  const t = useT();
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
      show(t('settings.notifications.denied'), 'info');
    }
  };

  // Google's consent rules (EEA, UK, Switzerland): a way to change the ad consent answer.
  const [privacyChoices, setPrivacyChoices] = useState(false);
  useEffect(() => {
    let live = true;
    void privacyChoicesAvailable().then((v) => live && setPrivacyChoices(v));
    return () => {
      live = false;
    };
  }, []);

  const togglePersonalizedAds = async (on: boolean) => {
    if (!on) {
      setSettings({ personalizedAds: false });
      return;
    }
    const res = await requestTrackingPermissionsAsync().catch(() => null);
    if (res?.granted) setSettings({ personalizedAds: true });
    else show(t('settings.privacy.trackingDenied'), 'info');
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
          dialogTitle: t('settings.save.exportTitle'),
        });
      } else {
        show(t('settings.save.noSharing'), 'error');
      }
    } catch {
      show(t('settings.save.exportFailed'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    const current = useGame.getState().city;
    if (!current || !useGame.getState().game) {
      show(t('settings.save.openCityFirst'), 'info');
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
        show(t('settings.save.otherCity'), 'error');
        return;
      }
      Alert.alert(
        t('settings.save.replaceTitle'),
        t('settings.save.replaceBody', { city: content.city(current.id, current.name) }),
        [
          { text: t('settings.save.cancel'), style: 'cancel' },
          {
            text: t('settings.save.replace'),
            style: 'destructive',
            onPress: () => {
              useGame.getState().replaceGame(imported);
              haptic.success();
              show(t('settings.save.imported'), 'success');
            },
          },
        ],
      );
    } catch (e) {
      haptic.error();
      show(e instanceof SaveError ? simError(e.message) : t('settings.save.readFailed'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={{ flex: 1 }}>
      <Screen title={t('settings.title')}>
        <Section title={t('settings.sections.sound')}>
          <Paper tone="surface" style={{ paddingVertical: SPACE.s, gap: SPACE.s }}>
            <Toggle
              label={t('settings.sound.label')}
              detail={t('settings.sound.detail')}
              value={settings.sound}
              onChange={(v) => setSettings({ sound: v })}
            />
            <Divider />
            <Level
              label={t('settings.sound.music')}
              value={settings.musicVolume}
              disabled={!settings.sound}
              onChange={(v) => setSettings({ musicVolume: v })}
            />
            <Level
              label={t('settings.sound.effects')}
              value={settings.sfxVolume}
              disabled={!settings.sound}
              onChange={(v) => {
                setSettings({ sfxVolume: v });
                sound.play('pop');
              }}
            />
            <Level
              label={t('settings.sound.ambience')}
              value={settings.ambienceVolume}
              disabled={!settings.sound}
              onChange={(v) => setSettings({ ambienceVolume: v })}
            />
          </Paper>
          <T size={13} muted>
            {t('settings.sound.silentSwitch')}
          </T>
        </Section>

        <Section title={t('settings.sections.feel')}>
          <Paper tone="surface" style={{ paddingVertical: SPACE.s }}>
            <Toggle
              label={t('settings.feel.haptics')}
              detail={t('settings.feel.hapticsDetail')}
              value={settings.haptics}
              onChange={(v) => setSettings({ haptics: v })}
            />
          </Paper>
          {/* The guided tutorial and the one-time screen tips, from the start. */}
          <Button
            kind="secondary"
            label={t('settings.feel.tutorial')}
            accessibilityHint={t('settings.feel.tutorialDetail')}
            onPress={() => {
              useProfile.getState().update((p) => {
                p.tutorialHidden = false;
                p.tipsSeen = [];
              });
              show(t('settings.feel.tutorialDone'), 'success');
            }}
          />
        </Section>

        <Section title={t('settings.sections.notifications')}>
          <Paper tone="surface" style={{ paddingVertical: SPACE.s }}>
            <Toggle
              label={t('settings.notifications.label')}
              detail={t('settings.notifications.detail')}
              value={settings.notifications.enabled}
              onChange={toggleNotifications}
            />
            <Divider />
            <Toggle
              label={t('settings.notifications.empty')}
              value={settings.notifications.empty}
              disabled={!settings.notifications.enabled}
              onChange={(v) => setNotifications({ empty: v })}
            />
            <Toggle
              label={t('settings.notifications.cashFull')}
              value={settings.notifications.cashFull}
              disabled={!settings.notifications.enabled}
              onChange={(v) => setNotifications({ cashFull: v })}
            />
            <Toggle
              label={t('settings.notifications.events')}
              value={settings.notifications.events}
              disabled={!settings.notifications.enabled}
              onChange={(v) => setNotifications({ events: v })}
            />
          </Paper>
        </Section>

        <Section title={t('settings.sections.look')}>
          <Paper tone="surface" style={{ paddingVertical: SPACE.s }}>
            <LanguagePicker />
            <Divider />
            <TempUnitPicker />
            <Divider />
            <View accessibilityRole="radiogroup">
              <Choice
                label={t('settings.look.bright')}
                detail={t('settings.look.brightDetail')}
                selected={settings.theme === 'city'}
                onPress={() => setSettings({ theme: 'city' })}
              />
              <Choice
                label={t('settings.look.system')}
                detail={t('settings.look.systemDetail')}
                selected={settings.theme === 'system'}
                onPress={() => setSettings({ theme: 'system' })}
              />
            </View>
          </Paper>
        </Section>

        <GameCenterSettings />

        <Section title={t('settings.sections.privacy')}>
          <Paper tone="surface" style={{ paddingVertical: SPACE.s }}>
            <Toggle
              label={t('settings.privacy.personalizedAds')}
              detail={t('settings.privacy.personalizedAdsDetail')}
              value={settings.personalizedAds}
              onChange={togglePersonalizedAds}
            />
            {privacyChoices ? (
              <>
                <Divider />
                <Button
                  kind="secondary"
                  label={t('settings.privacy.adChoices')}
                  onPress={() => void showPrivacyChoices()}
                />
              </>
            ) : null}
            <Divider />
            <Toggle
              label={t('settings.privacy.analytics')}
              detail={t('settings.privacy.analyticsDetail')}
              value={settings.analytics}
              onChange={(v) => setSettings({ analytics: v })}
            />
          </Paper>
          <T size={13} muted>
            {t('settings.privacy.note')}
          </T>
        </Section>

        <Section title={t('settings.sections.save')}>
          <T size={13} muted>
            {city
              ? t('settings.save.current', { city: content.city(city.id, city.name) })
              : t('settings.save.none')}
          </T>
          <Row gap={SPACE.s}>
            <Button
              style={{ flex: 1 }}
              kind="secondary"
              label={t('settings.save.export')}
              busy={busy === 'export'}
              disabled={!game || busy !== null}
              onPress={doExport}
            />
            <Button
              style={{ flex: 1 }}
              kind="secondary"
              label={t('settings.save.import')}
              busy={busy === 'import'}
              disabled={!game || busy !== null}
              onPress={doImport}
            />
          </Row>
        </Section>

        <Section title={t('settings.sections.about')}>
          <Row gap={SPACE.s}>
            <Button
              style={{ flex: 1 }}
              kind="secondary"
              label={t('credits.privacy.name')}
              onPress={() => void Linking.openURL(LINKS.privacy).catch(() => undefined)}
            />
            <Button
              style={{ flex: 1 }}
              kind="secondary"
              label={t('credits.support.name')}
              onPress={() => void Linking.openURL(LINKS.support).catch(() => undefined)}
            />
          </Row>
          <Button
            kind="secondary"
            label={t('settings.about.credits')}
            onPress={() => router.push('/credits')}
          />
          <Row style={{ justifyContent: 'space-between' }}>
            <T muted>{t('settings.about.app')}</T>
            <Mono
              muted
              suppressHighlighting
              accessibilityHint={t('settings.about.diagnosticsHint')}
              onLongPress={() => router.push('/diagnostics')}
            >
              {t('settings.about.version', { version })}
            </Mono>
          </Row>
        </Section>
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}

const styles = StyleSheet.create({
  meter: {
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: 12,
    backgroundColor: SKIN.led,
    borderWidth: 2,
    borderColor: '#0E1020',
  },
  segment: { flex: 1, height: TOUCH - 12, borderRadius: 6, shadowOffset: { width: 0, height: 0 } },
});
