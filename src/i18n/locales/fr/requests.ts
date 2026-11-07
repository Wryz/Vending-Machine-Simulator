// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/requests';

export default {
  reason: {
    thirsty: 'Je sors de {place}. Trop soif !',
    studying: 'Révisions tardives à {place}. Besoin d’énergie !',
    dorm: 'Plus rien à la résidence près de {place}.',
    charging: 'Plus de batterie près de {place} !',
    afterSchool: 'Fin des cours à {place}. C’est l’heure du goûter !',
    workout: 'Je sors de ma séance à {place}.',
    deadline: 'Grosse échéance à {place}.',
    visiting: 'Je rends visite à quelqu’un à {place}.',
    patient: 'Je sors de {place}. Pas en forme.',
    travel: 'En route à {place}.',
    game: 'Jour de match à {place} !',
    sunny: 'Au soleil à {place}.',
    lateNight: 'Longue nuit à {place}…',
    sweetTooth: 'Envie de sucré après {place}.',
    shopping: 'Pause shopping depuis {place}.',
    forgot: 'J’ai oublié le mien à {place} !',
    home: 'Je sors deux minutes de chez moi.',
  },
  card: {
    label: 'Demande client',
    title: 'Veut {product}',
    load: 'Charger',
    loaded: 'Touche Réappro',
    waiting: 'Attend {time}',
    tip: 'Pourboire {amount}',
    otherMachine: 'Ce distributeur ne peut pas le vendre. Installe un « {type} » à moins de {m} m.',
    locked: 'Disponible au chapitre {n}.',
  },
  served: {
    label: 'Demande servie',
    title: '{product} à {venue}',
    subtitle: 'Vendu, avec pourboire',
  },
  a11y: {
    bubble: 'Demande client : {product}. Touche pour ouvrir le distributeur.',
  },
} satisfies Shape<typeof en>;
