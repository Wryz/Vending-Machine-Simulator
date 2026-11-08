// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/companyHub';

export default {
  section: {
    hintOpen: 'Oculta esta sección',
    hintClosed: 'Muestra esta sección',
  },
  chapter: {
    requirements: 'Requisitos para subir de nivel',
    toReach: 'Para llegar al capítulo {n}',
    rewards: 'Se desbloquea al terminar este capítulo',
    last: 'Último capítulo: vende la empresa cuando quieras.',
    stepsHint: 'Toca un número para ver ese capítulo',
    stepHint: 'Muestra la meta y los desbloqueos de este capítulo',
  },
  chapterSheet: {
    title: 'Capítulo {n}',
    done: 'Hecho',
    current: 'Actual',
    locked: 'Próximo',
    goal: 'Meta',
    unlocks: 'Desbloquea',
    unlocked: 'Desbloqueado',
    close: 'Cerrar',
  },
  finances: {
    cash: 'Efectivo',
    cashDesc: 'Dinero disponible',
    netToday: 'Neto hoy',
    netTodayDesc: 'Entradas − salidas hoy',
    inToday: 'Entradas hoy',
    inTodayDesc: 'Ventas y premios',
    outToday: 'Salidas hoy',
    outTodayDesc: 'Stock, alquiler, sueldos…',
    netYesterday: 'Neto ayer',
    netYesterdayDesc: 'Todo el día',
    lifetimeSales: 'Ventas totales',
    lifetimeSalesDesc: 'Desde el inicio',
    lifetimeCosts: 'Costes totales',
    lifetimeCostsDesc: 'Desde el inicio',
    unitsSold: 'Artículos vendidos',
    unitsSoldDesc: 'En total',
    breakdown: 'Hoy por categoría',
    noActivity: 'Hoy aún no hay actividad',
  },
  more: {
    research: 'Investigación',
    rankings: 'Ranking de la ciudad',
    globalRanking: 'Ranking global',
    prestige: 'Prestigio',
    trophies: 'Trofeos',
  },
  trophies: {
    title: 'Trofeos',
    subtitle: '{got} de {total} desbloqueados',
    waiting: 'Premios pendientes',
    claim: 'Cobrar {amount}',
    claimed: 'Cobrado {amount}',
  },
} satisfies Shape<typeof en>;
