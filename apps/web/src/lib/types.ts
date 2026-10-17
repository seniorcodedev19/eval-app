export type Role = "admin" | "manager" | "member";
export type Status = "draft" | "submitted" | "approved" | "returned";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  team_id: number | null;
  active: boolean;
  job_title?: string;
  avatar?: string | null;
}
export interface Team {
  id: number;
  name: string;
}
export interface Period {
  id: number;
  label: string;
  start_date: string;
  end_date: string;
  locked: boolean;
}
export interface Entry {
  metric_id: number;
  planned: number;
  done: number;
  bonus: number;
  note: string | null;
  updated_at?: string;
}
export type FormulaType = "ratio" | "count" | "overtime";
export interface Metric {
  id: number;
  key: string;
  name: string;
  formula_type: FormulaType;
  weight: number;
  cap: number;
  target: number;
  overtime_rate: number;
  unit: string;
  team_id: number | null;
  team_name?: string | null;
  active: boolean;
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
export interface WeekReport {
  id?: number;
  status: Status;
  summary: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  bonus: number;
}
export interface WeekData {
  week_start: string;
  week_end: string;
  today: string;
  user: { id: number; name: string; email: string; team_id: number | null };
  status: Status;
  report: WeekReport | null;
  editable: boolean;
  metrics: Metric[];
  days: string[];
  daily: Record<number, Record<string, number>>;
  day_points: number[];
  time_hours: number;
  score: Score;
}
export interface TeamWeekRow {
  user_id: number;
  name: string;
  email: string;
  role: Role;
  status: Status;
  report_id: number | null;
  has_data: boolean;
  total: number;
  bonus: number;
  achievement_pct: number | null;
  day_points: number[];
  team_id: number | null;
  team_name: string | null;
  metric_points: { id: number; name: string; points: number }[];
}
export interface QueueItem {
  report_id: number;
  user_id: number;
  name: string;
  email: string;
  week_start: string;
  week_end: string;
  summary: string | null;
  submitted_at: string;
  score: Score;
}
export interface HistoryPoint {
  week_start: string;
  label: string;
  total: number;
  achievement_pct: number | null;
  status: Status;
}
export interface TimeLog {
  id: number;
  log_date: string;
  minutes: number;
  task: string;
  note: string | null;
}
export interface TimeWeek {
  week_start: string;
  week_end: string;
  today: string;
  days: string[];
  logs: TimeLog[];
  by_day: number[];
  total_minutes: number;
}
export interface Interview {
  id: number;
  member_id: number;
  interviewer_id: number;
  scheduled_at: string;
  topic: string;
  status: "scheduled" | "done" | "cancelled";
  notes: string | null;
  member_name: string;
  interviewer_name: string;
}
export interface Profile {
  id: number;
  email: string;
  name: string;
  role: Role;
  team_id: number | null;
  team_name: string | null;
  job_title: string;
  bio: string;
  avatar: string | null;
}
export interface AuditRow {
  id: number;
  at: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor: string | null;
}
