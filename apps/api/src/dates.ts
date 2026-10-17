// Weeks run Monday to Sunday. All dates are 'YYYY-MM-DD' strings handled in UTC.

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && isoDate(d) === s;
}

export function addDays(s: string, n: number): string {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

export function weekStartOf(s: string): string {
  const d = new Date(`${s}T00:00:00Z`);
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - sinceMonday);
  return isoDate(d);
}

export const todayUtc = () => isoDate(new Date());

export const weekDays = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

export function parseWeek(q?: string): string {
  return weekStartOf(q && validDate(q) ? q : todayUtc());
}
