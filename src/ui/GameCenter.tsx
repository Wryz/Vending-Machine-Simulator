import { useT } from '@/i18n';
import { showLeaderboards, signInToGameCenter, useGameCenter } from '@/services/gameCenter';
import { useTheme } from '@/ui/ThemeProvider';
import { Icon } from '@/ui/icons';
import { Button, Paper, Section, T } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

/**
 * Settings section for Apple Game Center. Hidden where Game Center can't work
 * (Android, or a dev client without the module). Signing in happens only when
 * the player taps the button; the game never asks on its own.
 */
export function GameCenterSettings() {
  const t = useT();
  const { available, authenticated, canSignIn, displayName } = useGameCenter();
  if (!available) return null;
  return (
    <Section title={t('gameCenter.section')}>
      <Paper tone="surface" style={{ paddingVertical: SPACE.s, gap: SPACE.s }}>
        <T weight="medium">
          {authenticated
            ? displayName
              ? t('gameCenter.signedIn', { name: displayName })
              : t('gameCenter.signedInNoName')
            : t('gameCenter.notSignedIn')}
        </T>
        <T size={13} muted>
          {authenticated || canSignIn ? t('gameCenter.detail') : t('gameCenter.openSettings')}
        </T>
        {authenticated ? (
          <Button
            kind="secondary"
            label={t('gameCenter.open')}
            accessibilityHint={t('gameCenter.openHint')}
            onPress={() => void showLeaderboards()}
          />
        ) : canSignIn ? (
          <Button
            kind="secondary"
            label={t('gameCenter.signIn')}
            accessibilityHint={t('gameCenter.signInHint')}
            onPress={() => void signInToGameCenter()}
          />
        ) : null}
      </Paper>
    </Section>
  );
}

/** Small "Global ranking" key: opens Game Center's boards. Only when signed in. */
export function GlobalRankingButton({ cityId }: { cityId?: string }) {
  const t = useT();
  const theme = useTheme();
  const authenticated = useGameCenter((s) => s.available && s.authenticated);
  if (!authenticated) return null;
  return (
    <Button
      kind="secondary"
      label={t('gameCenter.globalRanking')}
      accessibilityHint={t('gameCenter.globalRankingHint')}
      icon={<Icon name="globe" size={18} color={theme.ink} />}
      onPress={() => void showLeaderboards(cityId)}
    />
  );
}
