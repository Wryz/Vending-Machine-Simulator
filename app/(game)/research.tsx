import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { FAMILY_LABEL, MACHINE_TYPES, type MachineFamily } from '@/config/machines';
import { RESEARCH, type Research } from '@/config/progression';
import { t, useT } from '@/i18n';
import { content } from '@/i18n/content';
import { simError } from '@/i18n/sim';
import { sound } from '@/services/audio';
import { haptic } from '@/services/haptics';
import {
  businessDaysToMs,
  buyResearch,
  hasResearch,
  type ActionResult,
  type GameState,
} from '@/sim';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';
import { duration, money } from '@/ui/format';
import { StatChip } from '@/ui/hud';
import { Button, Mono, Paper, Row, Screen, T } from '@/ui/kit';
import { markSeen } from '@/ui/markSeen';
import { researchDoneCount } from '@/ui/moreBadges';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { SPACE, TOUCH } from '@/ui/theme';

const FAMILIES = Object.keys(FAMILY_LABEL) as MachineFamily[];

/** A machine family's display name. */
function familyLabel(f: MachineFamily): string {
  return t.or(`content.families.${f}`, FAMILY_LABEL[f]);
}

/** The research in the lab: a bar and the time left (it applies when done). */
function LabProgress({
  lab,
  now,
  family,
}: {
  lab: { startedAt: number; doneAt: number };
  now: number;
  family: string | null;
}) {
  const t = useT();
  const theme = useTheme();
  const share = Math.min(1, Math.max(0, (now - lab.startedAt) / (lab.doneAt - lab.startedAt)));
  return (
    <View style={{ gap: 4, marginTop: SPACE.xs }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.line, overflow: 'hidden' }}>
        <View style={{ width: `${share * 100}%`, height: 8, backgroundColor: theme.signal }} />
      </View>
      <T size={12} muted>
        {family
          ? t('company.research.inLabFamily', {
              family,
              time: duration(Math.max(0, lab.doneAt - now)),
            })
          : t('company.research.inLab', { time: duration(Math.max(0, lab.doneAt - now)) })}
      </T>
    </View>
  );
}

/** A per-family research button with a 44 pt target. */
function FamilyButton({
  label,
  color,
  done,
  disabled,
  onPress,
}: {
  label: string;
  color: string;
  done: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        done
          ? t('company.research.familyDone', { family: label })
          : t('company.research.familyHint', { family: label })
      }
      accessibilityState={{ disabled: done || disabled }}
      disabled={done || disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: TOUCH,
        paddingHorizontal: SPACE.m,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: done ? theme.signal : theme.line,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: disabled && !done ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <T size={13} weight="medium" color={done ? theme.signal : theme.ink}>
        {done ? t('company.research.familyDoneLabel', { family: label }) : label}
      </T>
    </Pressable>
  );
}

/**
 * Research (Company → More): the lab works on one upgrade at a time; it starts
 * when you pay and applies when it's done.
 */
export default function ResearchScreen() {
  const t = useT();
  const theme = useTheme();
  const game = useGame((s) => s.game);
  useGame((s) => s.version);
  const { flash, show } = useFlash();
  const labKey = game ? `${game.lab?.id ?? ''}:${researchDoneCount(game)}` : '';

  // Opening the screen (or finishing research while it is open) clears the badge.
  useEffect(() => {
    const g = useGame.getState().game;
    if (g) markSeen(g, 'research');
  }, [labKey]);

  const run = (fn: (d: GameState) => ActionResult, success: string) => {
    const r = useGame.getState().act(fn);
    if (r.ok) {
      haptic.success();
      sound.play('click');
      show(success, 'success');
    } else {
      haptic.error();
      show(simError(r.error), 'error');
    }
  };

  if (!game) return null;
  const familiesOpen = FAMILIES.filter((f) =>
    MACHINE_TYPES.some((m) => m.family === f && m.unlockChapter <= game.chapter),
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen title={t('company.research.section')}>
        <T size={13} muted>
          {game.lab ? t('company.research.labBusy') : t('company.research.labIntro')}
        </T>
        {RESEARCH.map((r: Research) => {
          const locked = game.chapter < r.unlockChapter;
          const families =
            r.id === 'id-check' ? familiesOpen.filter((f) => f === 'alcohol') : familiesOpen;
          const globalDone = !!r.global && hasResearch(game, r.id, 'snacks');
          const name = content.researchName(r.id, r.name);
          const desc = content.researchDesc(r.id, r.description);
          return (
            <Paper key={r.id} tone="surface" style={{ gap: SPACE.xs }}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <T weight="bold" accessibilityHint={desc}>
                    {name}
                  </T>
                  <T size={13} muted>
                    {desc}
                  </T>
                  <T size={12} muted>
                    {r.global
                      ? t('company.research.howGlobal', {
                          time: duration(businessDaysToMs(r.days)),
                        })
                      : t('company.research.howFamily', {
                          time: duration(businessDaysToMs(r.days)),
                        })}
                  </T>
                </View>
                <Mono size={13} muted={locked}>
                  {r.global
                    ? money(r.costCents)
                    : t('company.research.perFamily', { cost: money(r.costCents) })}
                </Mono>
              </Row>
              {game.lab?.id === r.id ? (
                <LabProgress
                  lab={game.lab}
                  now={game.now}
                  family={game.lab.key === '*' ? null : familyLabel(game.lab.key)}
                />
              ) : locked ? (
                <StatChip
                  icon="lock"
                  label={t('company.research.unlocksIn', { n: r.unlockChapter })}
                  value={t('company.research.chapterShort', { n: r.unlockChapter })}
                />
              ) : r.global ? (
                globalDone ? (
                  <StatChip
                    icon="star"
                    label={t('company.research.researched')}
                    value={t('company.research.done')}
                    color={theme.signal}
                  />
                ) : (
                  <Button
                    kind="secondary"
                    label={t('company.research.buy', { cost: money(r.costCents) })}
                    disabled={game.cashCents < r.costCents || !!game.lab}
                    onPress={() =>
                      run((d) => buyResearch(d, r.id), t('company.research.startedToast', { name }))
                    }
                  />
                )
              ) : families.length === 0 ? (
                <StatChip icon="grid" label={t('company.research.noMachines')} value="—" />
              ) : (
                <Row gap={SPACE.s} style={{ flexWrap: 'wrap', marginTop: SPACE.xs }}>
                  {families.map((f) => (
                    <FamilyButton
                      key={f}
                      label={familyLabel(f)}
                      color={theme.family[f]}
                      done={hasResearch(game, r.id, f)}
                      disabled={game.cashCents < r.costCents || !!game.lab}
                      onPress={() =>
                        run(
                          (d) => buyResearch(d, r.id, f),
                          t('company.research.startedFamilyToast', {
                            name,
                            family: familyLabel(f),
                          }),
                        )
                      }
                    />
                  ))}
                </Row>
              )}
            </Paper>
          );
        })}
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
