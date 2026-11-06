// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: 'Stell deinen ersten Automaten auf',
      line: 'Tippe auf eine belebte Straße. Die Flammen-Taste zeigt, wo Leute laufen.',
    },
    stock: {
      title: 'Füll ihn auf',
      line: 'Tippe auf deinen Automaten, dann auf Voll und Auffüllen.',
    },
    wait: {
      title: 'Warte auf Kunden',
      line: 'Zoom rein und sieh zu, wie Leute kommen und kaufen.',
    },
    collect: {
      title: 'Kassier dein Geld',
      line: 'Tippe auf deinen Automaten und leere die Kasse.',
    },
    goal: {
      title: 'Dein erstes Ziel',
      line: 'Mach $1,000 Umsatz, um Kapitel 1 abzuschließen. Die Anzeige oben zeigt den Stand.',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: 'Verstanden',
    close: 'Tutorial schließen',
  },
} satisfies Shape<typeof en>;
