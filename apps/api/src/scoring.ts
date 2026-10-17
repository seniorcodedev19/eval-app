// Pure scoring logic. No I/O so it is easy to test.
//
//   ratio metric: min(done / planned, cap) * weight + bonus
//   count metric: done * weight + bonus
//
// A ratio metric with planned = 0 is "n/a": it contributes only its bonus
// and is left out of the achievement percentage.

export type FormulaType = "ratio" | "count";

export interface MetricDef {
  id: number;
  key: string;
  name: string;
  formula_type: FormulaType;
  weight: number;
  cap: number;
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
}

export interface Score {
  total: number;
  base: number;
  bonus: number;
  achievement_pct: number | null;
  breakdown: MetricScore[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeScore(metrics: MetricDef[], entries: EntryRow[]): Score {
  const byMetric = new Map(entries.map((e) => [e.metric_id, e]));
  const breakdown: MetricScore[] = [];

  let ratioBase = 0;
  let ratioWeight = 0;

  for (const m of metrics) {
    const e = byMetric.get(m.id);
    if (!e) continue;

    let ratio: number | null = null;
    let base = 0;
    let na = false;

    if (m.formula_type === "ratio") {
      if (e.planned > 0) {
        ratio = Math.min(e.done / e.planned, m.cap);
        base = ratio * m.weight;
        ratioBase += base;
        ratioWeight += m.weight;
      } else {
        na = true;
      }
    } else {
      base = e.done * m.weight;
    }

    breakdown.push({
      metric_id: m.id,
      key: m.key,
      name: m.name,
      formula_type: m.formula_type,
      weight: m.weight,
      planned: e.planned,
      done: e.done,
      bonus: e.bonus,
      ratio: ratio === null ? null : r2(ratio),
      base: r2(base),
      contribution: r2(base + e.bonus),
      na,
    });
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
  d ? Object.values(d).reduce((s, v) => s + v, 0) : 0;

// Points earned on each day, before the weekly cap. Used for the day-by-day chart.
export function dayPoints(metrics: WeeklyMetric[], daily: DailyMap, days: string[]): number[] {
  return days.map((day) =>
    r2(
      metrics.reduce((sum, m) => {
        const v = daily[m.id]?.[day] ?? 0;
        if (m.formula_type === "ratio") return sum + (m.target > 0 ? (v / m.target) * m.weight : 0);
        return sum + v * m.weight;
      }, 0),
    ),
  );
}
