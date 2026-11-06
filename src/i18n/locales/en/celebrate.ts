/** Celebration cards ("moments") that drop in from the top of the screen. */
export default {
  /** Small heading above the card title, by kind. */
  kind: {
    chapter: 'Chapter complete',
    trophy: 'Trophy',
    order: 'Order complete',
    streak: 'All orders done',
    event: 'Coming up nearby',
    info: 'Note',
  },
  a11y: '{label}: {title}. Tap to dismiss.',
  moment: {
    /** Chapter complete card title: "2. Small business". */
    chapterTitle: '{n}. {title}',
    next: 'Next: {goal}',
    unlocked: 'Unlocked: {unlock}',
    /** {event} is the event name, {place} a real venue name from map data. */
    eventTitle: '{event} at {place}',
    startsMin: 'Starts in {n} min',
    startsHours: 'Starts in {n} h',
    /** A daily order is complete and its reward can be claimed. */
    orderReady: 'Order ready to claim',
  },
} as const;
