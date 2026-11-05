/** Money and number formatting. In-game dollars only (SPEC §6.3). */
const MINUS = '−';

export function money(cents: number, opts: { sign?: boolean; compact?: boolean } = {}): string {
  const neg = cents < 0;
  const abs = Math.abs(cents) / 100;
  let s: string;
  if (opts.compact && abs >= 10_000) {
    s =
      abs >= 1_000_000
        ? `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`
        : `${(abs / 1000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  } else {
    s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const sign = neg ? MINUS : opts.sign ? '+' : '';
  return `${sign}$${s}`;
}

export function pct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function meters(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function duration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ${min % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

export function clock(t: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(t));
}
