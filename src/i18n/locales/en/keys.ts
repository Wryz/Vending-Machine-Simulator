/** Key ring tab: one key tag per owned machine. */
export default {
  title: 'Key ring',
  noBusiness: 'No business is open.',
  subtitle: '{placed} placed · {stored} in storage',
  placed: 'Placed',
  nonePlaced: 'None placed yet.',
  inStorage: 'In storage',
  readyToPlace: 'Ready to place', // on a key tag, short
  place: 'Place', // small button: put a stored machine on the map
  /** Cash in the box last time you looked; {amount} is money, {ago} a duration like "2 h". */
  cashSeen: '{amount} · {ago} ago',
  a11y: {
    placeHint: 'Choose a spot on the map for this {machine}',
  },
} as const;
