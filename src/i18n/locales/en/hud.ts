/** Small HUD parts: round map buttons, stat chips, locked feature cards. */
export default {
  /** Round button with a badge; {badge} is usually a count. */
  buttonBadge: '{label}, {badge}',
  /** Stat chip read by VoiceOver, e.g. "Machines: 4". */
  statValue: '{label}: {value}',
  locked: {
    a11y: '{title}, unlocks in chapter {n}',
    chip: 'Ch. {n}', // small pill, ~6 chars max
  },
} as const;
