/** 1.10.0 > 1.9.2: compares dotted numbers, missing parts count as 0. */
export function isNewer(candidate: string, current: string): boolean {
  const a = candidate.split('.').map((x) => parseInt(x, 10) || 0);
  const b = current.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}
