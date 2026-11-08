// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/requests';

export default {
  reason: {
    thirsty: 'Acabo de comer en {place}. ¡Qué sed!',
    studying: 'Estudiando tarde en {place}. ¡Necesito energía!',
    dorm: 'Se acabó lo básico en la residencia de {place}.',
    charging: '¡Me quedo sin batería cerca de {place}!',
    afterSchool: 'Salida del cole en {place}. ¡Hora de merendar!',
    workout: 'Acabo de entrenar en {place}.',
    deadline: 'Gran entrega en {place}.',
    visiting: 'Visitando a alguien en {place}.',
    patient: 'Acabo de salir de {place}. No me encuentro bien.',
    travel: 'De camino en {place}.',
    game: '¡Día de partido en {place}!',
    sunny: 'Al sol en {place}.',
    lateNight: 'Noche larga en {place}…',
    sweetTooth: 'Me apetece algo dulce después de {place}.',
    shopping: 'Descanso de compras en {place}.',
    forgot: '¡Me dejé el mío en {place}!',
    home: 'Salgo un momento de casa.',
  },
  card: {
    label: 'Petición de cliente',
    title: 'Quiere {product}',
    load: 'Añadir a la reposición',
    planned: 'En tu plan de reposición. Pídelo para enviar una furgoneta.',
    order: 'Pedir reposición · {cost}',
    coming: 'Esperando la entrega · unos {time}',
    comingNote: 'Lo compran en cuanto llegue la furgoneta.',
    vanBusy: 'Ya hay una furgoneta en camino. Añádelo cuando llegue.',
    dismiss: 'Descartar petición',
    waiting: 'Espera {time}',
    tip: 'Propina {amount}',
    otherMachine: 'Esta máquina no puede venderlo. Coloca una «{type}» a menos de {m} m.',
    locked: 'Se abre en el capítulo {n}.',
  },
  served: {
    label: 'Petición atendida',
    title: '{product} en {venue}',
    subtitle: 'Vendido, con propina',
  },
  a11y: {
    bubble: 'Petición de cliente: {product}. Toca para abrir la máquina.',
  },
} satisfies Shape<typeof en>;
