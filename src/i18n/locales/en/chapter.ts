/** The chapter goal as one short line (money panel, company screen). */
export default {
  /** "$120 of $1k" (sales so far of the goal). */
  sales: '{have} of {goal}',
  /** {active} machines out of {n}; "van ✓" = the van is bought. */
  machinesVan: { one: '{active}/{n} machine · van ✓', other: '{active}/{n} machines · van ✓' },
  machinesNoVan: {
    one: '{active}/{n} machine · get a van',
    other: '{active}/{n} machines · get a van',
  },
  machinesDriver: {
    one: '{active}/{n} machine · {drivers}/1 driver',
    other: '{active}/{n} machines · {drivers}/1 driver',
  },
  machinesDrivers: {
    one: '{active}/{n} machine · {drivers}/3 drivers',
    other: '{active}/{n} machines · {drivers}/3 drivers',
  },
  share: '{pct}% of the market (goal 50%)',
  countries: '{have}/{n} countries · {sales} of {goal}',
  continents: '{have}/{n} continents · {sales} of {goal}',
  done: 'You run the city.',
} as const;
