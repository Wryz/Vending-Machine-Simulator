// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: 'Coloca tu primera máquina',
      line: 'Las calles concurridas venden más. La tecla de la llama te las muestra, o deja que elijamos un sitio.',
      action: 'Muéstrame un buen sitio',
      actionHint: 'Busca un sitio concurrido cerca y abre su ficha',
    },
    stock: {
      title: 'Llénala de snacks',
      line: 'Tu máquina está vacía. Ábrela y carga snacks desde tu furgoneta.',
      action: 'Abrir mi máquina',
      actionHint: 'Abre la ficha de tu máquina',
    },
    wait: {
      title: 'Espera a los clientes',
      line: 'La gente que pasa se detiene a comprar. ¡Acerca el mapa para verlo!',
      action: 'Ver mi máquina',
      actionHint: 'Acerca el mapa a tu máquina',
    },
    collect: {
      title: 'Recoge tus monedas',
      line: '¡Has vendido! Abre tu máquina y saca las monedas.',
      action: 'Abrir mi máquina',
      actionHint: 'Abre la ficha de tu máquina',
    },
    goal: {
      title: 'Tu primer objetivo',
      line: 'Vende {amount} para terminar el capítulo 1. El medidor de arriba lo sigue.',
    },
  },
  guide: {
    spotGood: '¡Buen sitio! Pon tu máquina aquí.',
    placeKey: 'Colocar',
    spotQuiet: 'Por aquí pasa poca gente. Baja esto y prueba una calle más concurrida.',
    sign: 'Baja y desliza el dedo por la línea para firmar.',
    fill: 'Toca Llenar para cargar snacks de tu furgoneta.',
    restock: 'Ahora toca Reponer para meterlos.',
    wait: '¡Listo! Cierra esto y mira cómo llegan los clientes.',
    collect: 'Toca Recoger para sacar tus monedas.',
  },
  tips: {
    keys: {
      title: 'Tu llavero',
      line: 'Aquí están todas tus máquinas. Toca una para ir a ella.',
    },
    routes: {
      title: 'Tu furgoneta y tus conductores',
      line: 'Una furgoneta más grande repone más de una vez. Más adelante, los conductores hacen las rondas por ti.',
    },
    orders: {
      title: 'Pedidos del día',
      line: 'Tres pequeños encargos al día con dinero extra. Termina los tres para sumar una racha.',
    },
    company: {
      title: 'Tu empresa',
      line: 'Tu objetivo del capítulo, el dinero que entra y sale, y mejoras para todas tus máquinas.',
    },
    rankings: {
      title: 'Mejores operadores',
      line: 'Compara tus ventas con las otras empresas de máquinas de la ciudad.',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: 'Entendido',
    close: 'Cerrar el tutorial',
    step: 'Paso {n} de {total}',
  },
} satisfies Shape<typeof en>;
