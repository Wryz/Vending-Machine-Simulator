// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/companyHub';

export default {
  section: {
    hintOpen: 'Blendet diesen Abschnitt aus',
    hintClosed: 'Zeigt diesen Abschnitt',
  },
  chapter: {
    requirements: 'Voraussetzungen zum Aufstieg',
    toReach: 'Für Kapitel {n}',
    rewards: 'Wird frei, wenn du dieses Kapitel abschließt',
    last: 'Letztes Kapitel: Verkaufe die Firma, wenn du bereit bist.',
    stepsHint: 'Tippe auf eine Zahl, um das Kapitel zu sehen',
    stepHint: 'Zeigt Ziel und Freischaltungen dieses Kapitels',
  },
  chapterSheet: {
    title: 'Kapitel {n}',
    done: 'Geschafft',
    current: 'Aktuell',
    locked: 'Später',
    goal: 'Ziel',
    unlocks: 'Schaltet frei',
    unlocked: 'Freigeschaltet',
    close: 'Schließen',
  },
  finances: {
    cash: 'Bargeld',
    cashDesc: 'Verfügbares Geld',
    netToday: 'Netto heute',
    netTodayDesc: 'Ein − Aus heute',
    inToday: 'Ein heute',
    inTodayDesc: 'Umsatz und Prämien',
    outToday: 'Aus heute',
    outTodayDesc: 'Ware, Miete, Löhne…',
    netYesterday: 'Netto gestern',
    netYesterdayDesc: 'Ganzer Tag',
    lifetimeSales: 'Umsatz gesamt',
    lifetimeSalesDesc: 'Seit dem Start',
    lifetimeCosts: 'Kosten gesamt',
    lifetimeCostsDesc: 'Seit dem Start',
    unitsSold: 'Verkaufte Artikel',
    unitsSoldDesc: 'Insgesamt',
    breakdown: 'Heute nach Kategorie',
    noActivity: 'Heute noch keine Aktivität',
  },
  more: {
    research: 'Forschung',
    rankings: 'Stadtrangliste',
    globalRanking: 'Weltrangliste',
    prestige: 'Prestige',
    trophies: 'Trophäen',
  },
  trophies: {
    title: 'Trophäen',
    subtitle: '{got} von {total} freigeschaltet',
    waiting: 'Prämien warten',
    claim: '{amount} abholen',
    claimed: '{amount} abgeholt',
  },
} satisfies Shape<typeof en>;
