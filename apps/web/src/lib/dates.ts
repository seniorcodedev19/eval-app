// Weeks run Monday to Sunday; dates are 'YYYY-MM-DD' strings handled in UTC.
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(s: string, n: number): string {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

export function weekStartOf(s: string): string {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return isoDate(d);
}

const fmtUtc = (s: string, o: Intl.DateTimeFormatOptions) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", { ...o, timeZone: "UTC" });

export const shortDay = (s: string) => fmtUtc(s, { weekday: "short" });
export const dayMonth = (s: string) => fmtUtc(s, { month: "short", day: "numeric" });
export const weekLabel = (start: string, end: string) => `${dayMonth(start)} to ${dayMonth(end)}`;

// A usable ?week= value or undefined.
export function weekParam(w?: string): string | undefined {
  return w && /^\d{4}-\d{2}-\d{2}$/.test(w) && !Number.isNaN(Date.parse(w)) ? w : undefined;
}
