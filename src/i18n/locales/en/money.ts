/** The money LED panel on the map (cash, chapter meter, today's sales). */
export default {
  a11y: {
    /** {title} is the chapter title, {progress} the chapter goal line (e.g. "$120 of $1k"). */
    panel:
      'Cash {cash}. Chapter {n}, {title}: {progress}. Today {today} in sales, {waiting} waiting in your machines.',
    /** The rolling cash readout. */
    cash: 'Cash {amount}',
  },
} as const;
