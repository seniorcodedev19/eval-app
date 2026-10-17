export type Role = "admin" | "manager" | "member";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  team_id: number | null;
  active: boolean;
}
export interface Team {
  id: number;
  name: string;
}
export interface Metric {
  id: number;
  key: string;
  name: string;
  formula_type: "ratio" | "count";
  weight: number;
  cap: number;
  active: boolean;
}
export interface Period {
  id: number;
  label: string;
  start_date: string;
  end_date: string;
  locked: boolean;
}
export interface MetricScore {
  metric_id: number;
  key: string;
  name: string;
  formula_type: "ratio" | "count";
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
export interface ScoreResponse {
  user: User;
  period: Period;
  score: Score;
}
export interface Entry {
  metric_id: number;
  planned: number;
  done: number;
  bonus: number;
  note: string | null;
}
export interface TrendPoint {
  period_id: number;
  label: string;
  total: number;
  achievement_pct: number | null;
}
export interface TeamRow {
  user_id: number;
  name: string;
  email: string;
  team_id: number | null;
  role: Role;
  has_data: boolean;
  total: number;
  bonus: number;
  achievement_pct: number | null;
}
export interface AuditRow {
  id: number;
  at: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor: string | null;
}
