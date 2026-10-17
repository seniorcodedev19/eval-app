export const fmt = (n: number) =>
  (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

export const hours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10} h`;
