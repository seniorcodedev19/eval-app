// Pure scoring logic. No I/O so it is easy to test.
//
//   ratio metric: min(done / planned, cap) * weight + bonus
//   count metric: done * weight + bonus
//   overtime metric: (min(done, target) / target * weight) + (extra * overtime_rate)
//     extra = max(0, done - target). Base never uses hours above the target.
//
// A ratio/overtime metric with planned = 0 is "n/a": it contributes only its bonus
// and is left out of the achievement percentage.

export type FormulaType = "ratio" | "count" | "overtime";

export const TIME_TRACKING_KEY = "time_tracking";

export function isTimeTracking(m: { key?: string; formula_type?: string }) {
  return m.key === TIME_TRACKING_KEY || m.formula_type === "overtime";
}

export interface MetricDef {
  id: number;
  key: string;
  name: string;
  formula_type: FormulaType;
  weight: number;
  cap: number;
  overtime_rate?: number;
}

export interface EntryRow {
  metric_id: number;
  planned: number;
  done: number;
  bonus: number;
}

export interface MetricScore {
  metric_id: number;
  key: string;
  name: string;
  formula_type: FormulaType;
  weight: number;
  planned: number;
  done: number;
  bonus: number;
  ratio: number | null;
  base: number;
  contribution: number;
  na: boolean;
  part?: "base" | "bonus";
}

export interface Score {
  total: number;
  base: number;
  bonus: number;
  achievement_pct: number | null;
  breakdown: MetricScore[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (n: number | string | undefined, fallback = 0) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
};

function row(
  m: MetricDef,
  e: EntryRow,
  extra: Partial<MetricScore> & Pick<MetricScore, "base" | "bonus" | "contribution" | "na">,
): MetricScore {
  return {
    metric_id: m.id,
    key: m.key,
    name: m.name,
    formula_type: m.formula_type,
    weight: num(m.weight),
    planned: num(e.planned),
    done: num(e.done),
    ratio: null,
    ...extra,
    bonus: r2(extra.bonus),
    base: r2(extra.base),
    contribution: r2(extra.contribution),
  };
}

export function computeScore(metrics: MetricDef[], entries: EntryRow[]): Score {
  const byMetric = new Map(entries.map((e) => [e.metric_id, e]));
  const breakdown: MetricScore[] = [];

  let ratioBase = 0;
  let ratioWeight = 0;

  for (const m of metrics) {
    const e = byMetric.get(m.id);
    if (!e) continue;
    const planned = num(e.planned);
    const done = num(e.done);
    const entryBonus = num(e.bonus);
    const weight = num(m.weight);
    const cap = num(m.cap, 1.2);

    if (m.formula_type === "ratio") {
      if (planned > 0) {
        const ratio = Math.min(done / planned, cap);
        const base = ratio * weight;
        ratioBase += base;
        ratioWeight += weight;
        breakdown.push(
          row(m, e, { ratio: r2(ratio), base, bonus: entryBonus, contribution: base + entryBonus, na: false }),
        );
      } else {
        breakdown.push(row(m, e, { base: 0, bonus: entryBonus, contribution: entryBonus, na: true }));
      }
      continue;
    }

    if (m.formula_type === "overtime") {
      const rate = num(m.overtime_rate);
      if (planned <= 0) {
        breakdown.push(row(m, e, { base: 0, bonus: entryBonus, contribution: entryBonus, na: true, part: "base" }));
        continue;
      }
      const capped = Math.min(done, planned);
      const extra = Math.max(0, done - planned);
      const ratio = capped / planned;
      const base = ratio * weight;
      const overtimePts = extra * rate;
      ratioBase += base;
      ratioWeight += weight;
      breakdown.push(
        row(m, e, {
          key: m.key,
          name: m.name,
          ratio: r2(ratio),
          done: capped,
          base,
          bonus: 0,
          contribution: base,
          na: false,
          part: "base",
        }),
      );
      breakdown.push(
        row(m, { ...e, done: extra }, {
          key: `${m.key}_overtime`,
          name: `${m.name} overtime`,
          ratio: null,
          planned: 0,
          done: extra,
          weight: rate,
          base: 0,
          bonus: overtimePts + entryBonus,
          contribution: overtimePts + entryBonus,
          na: false,
          part: "bonus",
        }),
      );
      continue;
    }

    const base = done * weight;
    breakdown.push(row(m, e, { base, bonus: entryBonus, contribution: base + entryBonus, na: false }));
  }

  const base = breakdown.reduce((s, b) => s + b.base, 0);
  const bonus = breakdown.reduce((s, b) => s + b.bonus, 0);

  return {
    total: r2(base + bonus),
    base: r2(base),
    bonus: r2(bonus),
    achievement_pct: ratioWeight > 0 ? r2((ratioBase / ratioWeight) * 100) : null,
    breakdown,
  };
}

// ---------- weekly helpers ----------

export interface WeeklyMetric extends MetricDef {
  target: number;
  unit: string;
}

// metric id -> date -> value
export type DailyMap = Record<number, Record<string, number>>;

export const sumDaily = (d: Record<string, number> | undefined) =>
  d ? Object.values(d).reduce((s, v) => s + num(v), 0) : 0;

// Points earned on each day, before weekly overtime. Used for the day-by-day chart.
export function dayPoints(metrics: WeeklyMetric[], daily: DailyMap, days: string[]): number[] {
  return days.map((day) =>
    r2(
      metrics.reduce((sum, m) => {
        const v = num(daily[m.id]?.[day]);
        if (m.formula_type === "count") return sum + v * num(m.weight);
        const target = num(m.target);
        return sum + (target > 0 ? (v / target) * num(m.weight) : 0);
      }, 0),
    ),
  );
}
