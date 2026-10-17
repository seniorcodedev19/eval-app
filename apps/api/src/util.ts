import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { pool } from "./db";
import { computeScore, type EntryRow, type MetricDef, type Score } from "./scoring";

export const h =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid input", issues: err.issues });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  const code = (err as { code?: string })?.code;
  if (code === "23505") return res.status(409).json({ error: "That value already exists" });
  if (code === "23503") return res.status(400).json({ error: "Referenced record does not exist" });
  console.error(err);
  res.status(500).json({ error: "Server error" });
}

export async function audit(
  actorId: number | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  detail?: unknown,
) {
  await pool.query(
    "insert into audit_log (actor_id, action, entity, entity_id, detail) values ($1,$2,$3,$4,$5)",
    [actorId, action, entity, entityId === null ? null : String(entityId), detail ? JSON.stringify(detail) : null],
  );
}

export async function activeMetrics(): Promise<MetricDef[]> {
  const { rows } = await pool.query<MetricDef>(
    "select id, key, name, formula_type, weight, cap from metrics where active order by id",
  );
  return rows;
}

export const emptyScore: Score = { total: 0, base: 0, bonus: 0, achievement_pct: null, breakdown: [] };

// Score for one user in one period. Locked periods read the stored snapshot.
export async function scoreFor(userId: number, period: { id: number; locked: boolean }): Promise<Score> {
  if (period.locked) {
    const { rows } = await pool.query(
      "select total, base, bonus, achievement_pct, breakdown from score_snapshots where user_id=$1 and period_id=$2",
      [userId, period.id],
    );
    return rows[0] ?? emptyScore;
  }
  const [metrics, entries] = await Promise.all([
    activeMetrics(),
    pool.query<EntryRow>(
      "select metric_id, planned, done, bonus from entries where user_id=$1 and period_id=$2",
      [userId, period.id],
    ),
  ]);
  return computeScore(metrics, entries.rows);
}

export { computeScore };
