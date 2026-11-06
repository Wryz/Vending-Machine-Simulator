// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/store';

export default {
  stillCounting: 'On compte encore les pièces.',
  noGame: 'Aucune partie chargée.',
  load: {
    noApi: 'L’API de données n’est pas configurée.',
    badPack: 'Pack de région non pris en charge.',
    noPack: 'Aucun pack intégré pour {id}',
    http: 'HTTP {status}',
  },
} satisfies Shape<typeof en>;
