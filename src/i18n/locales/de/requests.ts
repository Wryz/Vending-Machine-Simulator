// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/requests';

export default {
  reason: {
    thirsty: 'Gerade bei {place} gegessen. So durstig!',
    studying: 'Lerne spät bei {place}. Brauche Energie!',
    dorm: 'Im Wohnheim bei {place} ist alles alle.',
    charging: 'Handy fast leer bei {place}!',
    afterSchool: 'Schule aus bei {place}. Snackzeit!',
    workout: 'Gerade bei {place} trainiert.',
    deadline: 'Große Deadline bei {place}.',
    visiting: 'Besuche jemanden bei {place}.',
    patient: 'Komme gerade aus {place}. Mir geht’s nicht gut.',
    travel: 'Unterwegs bei {place}.',
    game: 'Spieltag bei {place}!',
    sunny: 'In der Sonne bei {place}.',
    lateNight: 'Lange Nacht bei {place}…',
    sweetTooth: 'Lust auf was Süßes nach {place}.',
    shopping: 'Shopping-Pause von {place}.',
    forgot: 'Meins bei {place} vergessen!',
    home: 'Kurz raus von zu Hause.',
  },
  card: {
    label: 'Kundenwunsch',
    title: 'Möchte {product}',
    load: 'Einladen',
    loaded: 'Jetzt Auffüllen tippen',
    waiting: 'Wartet {time}',
    tip: 'Trinkgeld {amount}',
    otherMachine:
      'Dieser Automat kann das nicht verkaufen. Stell einen „{type}“ im Umkreis von {m} m auf.',
    locked: 'Ab Kapitel {n}.',
  },
  served: {
    label: 'Wunsch erfüllt',
    title: '{product} bei {venue}',
    subtitle: 'Verkauft, plus Trinkgeld',
  },
  a11y: {
    bubble: 'Kundenwunsch: {product}. Tippen, um den Automaten zu öffnen.',
  },
} satisfies Shape<typeof en>;
