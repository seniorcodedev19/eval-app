import { pool } from "./db";
import { weekDays } from "./dates";
import {
  computeScore,
  dayPoints,
  sumDaily,
  type DailyMap,
  type MetricScore,
  type Score,
  type WeeklyMetric,
} from "./scoring";

const r2 = (n: number) => Math.round(n * 100) / 100;

export type ReportStatus = "draft" | "submitted" | "approved" | "returned";

export interface ReportRow {
  id: number;
  user_id: number;
  week_start: string;
  status: ReportStatus;
  summary: string | null;
  submitted_at: string | null;
  reviewer_id: number | null;
  reviewed_at: string | null;
  review_comment: string | null;
  bonus: number;
  total: number | null;
  achievement_pct: number | null;
  breakdown: MetricScore[] | null;
}

export type MetricRow = WeeklyMetric & { team_id: number | null; active: boolean };

// Metrics a person reports on: the global ones plus their team's.
export async function metricsForTeam(teamId: number | null, onlyActive: boolean): Promise<MetricRow[]> {
  const { rows } = await pool.query<MetricRow>(
    `select id, key, name, formula_type, weight, cap, target, unit, team_id, active
     from metrics
     where (team_id is null or team_id = $1) and ($2::boolean = false or active)
     order by id`,
    [teamId, onlyActive],
  );
  return rows;
}

export async function getReport(userId: number, weekStart: string): Promise<ReportRow | null> {
  const { rows } = await pool.query<ReportRow>(
    "select * from weekly_reports where user_id=$1 and week_start=$2",
    [userId, weekStart],
  );
  return rows[0] ?? null;
}

export async function dailyMap(userId: number, days: string[]): Promise<DailyMap> {
  const { rows } = await pool.query<{ metric_id: number; entry_date: string; value: number }>(
    "select metric_id, entry_date, value from daily_entries where user_id=$1 and entry_date between $2 and $3",
    [userId, days[0], days[6]],
  );
  const out: DailyMap = {};
  for (const r of rows) (out[r.metric_id] ??= {})[r.entry_date] = r.value;
  return out;
}

export function finalScore(r: ReportRow): Score {
  const total = r.total ?? 0;
  return { total, base: r2(total - r.bonus), bonus: r.bonus, achievement_pct: r.achievement_pct, breakdown: r.breakdown ?? [] };
}

// Everything about one person's week. Approved weeks return the stored final score.
export async function weekSnapshot(user: { id: number; team_id: number | null }, weekStart: string) {
  const days = weekDays(weekStart);
  const [metrics, daily, report] = await Promise.all([
    metricsForTeam(user.team_id, true),
    dailyMap(user.id, days),
    getReport(user.id, weekStart),
  ]);
  const live = computeScore(
    metrics,
    metrics.map((m) => ({ metric_id: m.id, planned: m.target, done: sumDaily(daily[m.id]), bonus: 0 })),
  );
  const score = report?.status === "approved" && report.breakdown ? finalScore(report) : live;
  const hasData = Object.values(daily).some((d) => Object.keys(d).length > 0);
  return { days, metrics, daily, report, live, score, hasData, day_points: dayPoints(metrics, daily, days) };
}

export const publicReport = (r: ReportRow | null) =>
  r && {
    status: r.status,
    summary: r.summary,
    submitted_at: r.submitted_at,
    reviewed_at: r.reviewed_at,
    review_comment: r.review_comment,
    bonus: r.bonus,
  };
