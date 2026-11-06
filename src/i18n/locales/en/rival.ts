/**
 * The rival's owner (Rex Brightley of Brightvend, fictional) and surprise
 * moments (VIP customer, jackpot hour, venue deal). {rival} is the company
 * name, {owner} the owner's name; neither is translated. {venue} is a real
 * place name from map data.
 */
export default {
  /** Card heading when the rival's owner talks: "Rex Brightley · Brightvend". */
  says: '{owner} · {rival}',
  /** Taunts, by situation. Short, cheeky, never mean. */
  taunt: {
    arrives1: 'Nice little machine. Shame about the neighbor.',
    arrives2: 'Room for two? Not for long.',
    arrives3: 'Hi, neighbor! I brought lower prices.',
    ramp1: 'Time to get serious. Trucks are on the way.',
    ramp2: 'You had a good run. Now watch a pro.',
    placed1: 'Same snacks. Eight percent cheaper.',
    placed2: 'I found a spot right next to yours. Cozy!',
    placed3: 'Your customers will love my prices.',
    steal1: 'They wanted better service. I said yes.',
    steal2: 'Your venue just signed with me. No hard feelings.',
    retreat1: "Fine, keep that corner. It's drafty anyway.",
    retreat2: 'I was leaving that spot. Totally planned.',
    retreat3: 'Okay, okay. You win that block.',
    passed1: 'Enjoy the top spot while it lasts.',
    passed2: "Beginner's luck. I'll be back on top by Friday.",
    behind1: "Look who's number one now.",
    behind2: 'Market share is a fun word, right?',
  },
  /** One line under the taunt saying what actually happened. */
  fact: {
    arrives: '{rival} opened a machine near {venue}',
    ramp: '{rival} is expanding: {n} machines',
    placed: 'New {rival} machine near {venue}, prices −{pct}%',
    steal: '{venue} switched to {rival}',
    retreat: '{rival} pulled out near {venue}',
    passed: 'Market share: you {pct}%',
    behind: 'Market share: you {pct}%',
  },
  /** Sale-pop chip when a customer goes to the rival instead: "−$1.75 → Brightvend". */
  sting: '−{money} → {rival}',
  sheet: {
    title: '{rival}',
    owner: 'Owner: {owner}',
    theirs: 'Their price',
    yours: 'Your price',
    /** Distance from the rival machine to your nearest one. */
    distance: '{m} m from {venue}',
    noneNearby: 'None of your machines is close by.',
    undercut: 'Undercut',
    /** Shown under the Undercut key. */
    undercutHint: 'Your machines within {m} m drop to {pct}% of the suggested price',
    undercutLocked: 'Price setting unlocks after chapter 1',
    undercutDone: { one: 'Repriced {n} item', other: 'Repriced {n} items' },
    undercutNone: 'Your prices are already lower',
    betterSpot: 'Find a better spot',
    a11y: {
      close: 'Close',
      portrait: 'Portrait of {owner}',
      undercut: 'Undercut {rival} near this machine',
      betterSpot: 'Show busy streets on the map',
    },
  },
  surprise: {
    vipLabel: 'VIP customer',
    vipTitle: 'Bought a whole row at {venue}',
    vipSub: { one: '{n} item in one go', other: '{n} items in one go' },
    jackpotLabel: 'Jackpot hour',
    jackpotTitle: '{venue} is buzzing: ×{x} customers',
    jackpotSub: 'For the next {n} min',
    dealLabel: 'Venue deal',
    dealTitle: '{venue}: commission {from}% → {to}%',
    dealSub: 'For {n} min if you accept now',
    dealAccept: 'Accept',
    dealAccepted: 'Deal on: commission {to}% for {n} min',
    dealGone: 'That offer is gone',
  },
  /** Map badges over machines. */
  marker: {
    jackpot: 'Jackpot hour at this machine',
    deal: 'Venue deal: tap to accept',
    dealOn: 'Venue deal running',
  },
} as const;
