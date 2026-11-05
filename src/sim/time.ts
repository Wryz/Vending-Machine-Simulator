import { FIXED_HOLIDAYS, MOVABLE_HOLIDAYS, SOUTHERN_HEMISPHERE } from '@/config/holidays';
import { BUSINESS_DAY_REAL_MS, TIME } from '@/config/economy';

/**
 * Real-world clock helpers. The world clock is the city's real local time;
 * the business clock runs `TIME.salesTimeScale`× faster (see config/economy.ts).
 */

export interface LocalTime {
  /** Fractional local hour 0..24. */
  hour: number;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** YYYY-MM-DD in the city's zone. */
  dateKey: string;
  month: number;
  /** Weekend or public holiday. */
  restDay: boolean;
  /** Minutes the zone is ahead of UTC at this instant. */
  offsetMinutes: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function isHoliday(countryCode: string, dateKey: string): boolean {
  return (
    (FIXED_HOLIDAYS[countryCode]?.includes(dateKey.slice(5)) ?? false) ||
    (MOVABLE_HOLIDAYS[countryCode]?.includes(dateKey) ?? false)
  );
}

export function localTime(t: number, timeZone: string, countryCode: string): LocalTime {
  const parts: Record<string, string> = {};
  for (const p of formatter(timeZone).formatToParts(new Date(t))) parts[p.type] = p.value;
  const y = Number(parts.year);
  const mo = Number(parts.month);
  const d = Number(parts.day);
  const h = Number(parts.hour) % 24;
  const mi = Number(parts.minute);
  const s = Number(parts.second);
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = WEEKDAYS[parts.weekday] ?? 0;
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  const offsetMinutes = Math.round((asUtc - Math.floor(t / 1000) * 1000) / 60_000);
  return {
    hour: h + mi / 60 + s / 3600,
    weekday,
    dateKey,
    month: mo,
    restDay: weekday === 0 || weekday === 6 || isHoliday(countryCode, dateKey),
    offsetMinutes,
  };
}

/** UTC epoch ms for a local date + hour in a zone (uses the offset at local noon). */
export function localToUtc(
  dateKey: string,
  hour: number,
  timeZone: string,
  countryCode: string,
): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const noonGuess = Date.UTC(y, m - 1, d, 12);
  const off = localTime(noonGuess, timeZone, countryCode).offsetMinutes;
  return Date.UTC(y, m - 1, d, 0) + hour * 3_600_000 - off * 60_000;
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function isSummer(month: number, countryCode: string): boolean {
  const south = SOUTHERN_HEMISPHERE.includes(countryCode);
  return south ? month === 12 || month <= 2 : month >= 6 && month <= 8;
}

/** Real ms -> business hours. */
export function businessHours(realMs: number): number {
  return (realMs / 3_600_000) * TIME.salesTimeScale;
}

/** Real ms -> business days. */
export function businessDays(realMs: number): number {
  return realMs / BUSINESS_DAY_REAL_MS;
}

/** Business hours -> real ms. */
export function businessHoursToMs(hours: number): number {
  return (hours * 3_600_000) / TIME.salesTimeScale;
}

export function businessDaysToMs(days: number): number {
  return days * BUSINESS_DAY_REAL_MS;
}
