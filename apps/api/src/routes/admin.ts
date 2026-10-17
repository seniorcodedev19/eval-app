import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../auth";
import { pool } from "../db";
import { computeScore, type EntryRow, type MetricDef } from "../scoring";
import { audit, h, HttpError } from "../util";

export const admin = Router();

// ---------- reference data (any signed-in user) ----------
admin.get("/teams", h(async (_req, res) => {
  const { rows } = await pool.query("select id, name from teams order by name");
  res.json(rows);
}));

admin.get("/metrics", h(async (_req, res) => {
  const { rows } = await pool.query(
    "select id, key, name, formula_type, weight, cap, active from metrics order by id",
  );
  res.json(rows);
}));

admin.get("/periods", h(async (_req, res) => {
  const { rows } = await pool.query(
    "select id, label, start_date, end_date, locked from periods order by start_date desc",
  );
  res.json(rows);
}));

// ---------- admin only ----------
const adminOnly = requireRole("admin");

admin.get("/users", h(async (req, res) => {
  const actor = req.user!;
  if (actor.role === "member") throw new HttpError(403, "Not allowed");
  const { rows } = await pool.query(
    `select id, email, name, role, team_id, active from users
     where ($1::boolean or team_id = $2) order by name, email`,
    [actor.role === "admin", actor.team_id],
  );
  res.json(rows);
}));

admin.patch("/users/:id", adminOnly, h(async (req, res) => {
  const id = Number(req.params.id);
  const body = z
    .object({
      role: z.enum(["admin", "manager", "member"]).optional(),
      team_id: z.number().int().nullable().optional(),
      active: z.boolean().optional(),
    })
    .parse(req.body);

  if (id === req.user!.id && (body.role && body.role !== "admin" || body.active === false)) {
    throw new HttpError(400, "You can't remove your own admin access or deactivate yourself");
  }
  const { rows } = await pool.query(
    `update users set
       role = coalesce($2, role),
       team_id = case when $3::boolean then $4 else team_id end,
       active = coalesce($5, active)
     where id = $1 returning id, email, name, role, team_id, active`,
    [id, body.role ?? null, "team_id" in body, body.team_id ?? null, body.active ?? null],
  );
  if (!rows[0]) throw new HttpError(404, "User not found");
  await audit(req.user!.id, "update", "user", id, body);
  res.json(rows[0]);
}));

admin.post("/teams", adminOnly, h(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(1).max(80) }).parse(req.body);
  const { rows } = await pool.query("insert into teams (name) values ($1) returning id, name", [body.name]);
  await audit(req.user!.id, "create", "team", rows[0].id, body);
  res.status(201).json(rows[0]);
}));

admin.patch("/teams/:id", adminOnly, h(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(1).max(80) }).parse(req.body);
  const { rows } = await pool.query("update teams set name=$2 where id=$1 returning id, name", [
    Number(req.params.id),
    body.name,
  ]);
  if (!rows[0]) throw new HttpError(404, "Team not found");
  await audit(req.user!.id, "update", "team", rows[0].id, body);
  res.json(rows[0]);
}));

const metricBase = {
  name: z.string().trim().min(1).max(80),
  formula_type: z.enum(["ratio", "count"]),
  weight: z.number().min(0).max(10000),
  cap: z.number().gt(0).max(10),
  active: z.boolean(),
};

admin.post("/metrics", adminOnly, h(async (req, res) => {
  const body = z
    .object({ ...metricBase, key: z.string().trim().regex(/^[a-z0-9_]+$/, "lowercase letters, digits, underscore") })
    .partial({ cap: true, active: true })
    .parse(req.body);
  const { rows } = await pool.query(
    `insert into metrics (key, name, formula_type, weight, cap, active)
     values ($1,$2,$3,$4,$5,$6) returning id, key, name, formula_type, weight, cap, active`,
    [body.key, body.name, body.formula_type, body.weight, body.cap ?? 1.2, body.active ?? true],
  );
  await audit(req.user!.id, "create", "metric", rows[0].id, body);
  res.status(201).json(rows[0]);
}));

admin.patch("/metrics/:id", adminOnly, h(async (req, res) => {
  const body = z.object(metricBase).partial().parse(req.body);
  const { rows } = await pool.query(
    `update metrics set
       name = coalesce($2, name), formula_type = coalesce($3, formula_type),
       weight = coalesce($4, weight), cap = coalesce($5, cap), active = coalesce($6, active)
     where id = $1 returning id, key, name, formula_type, weight, cap, active`,
    [Number(req.params.id), body.name ?? null, body.formula_type ?? null, body.weight ?? null, body.cap ?? null, body.active ?? null],
  );
  if (!rows[0]) throw new HttpError(404, "Metric not found");
  await audit(req.user!.id, "update", "metric", rows[0].id, body);
  res.json(rows[0]);
}));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

admin.post("/periods", adminOnly, h(async (req, res) => {
  const body = z
    .object({ label: z.string().trim().min(1).max(40), start_date: isoDate, end_date: isoDate })
    .parse(req.body);
  const { rows } = await pool.query(
    "insert into periods (label, start_date, end_date) values ($1,$2,$3) returning id, label, start_date, end_date, locked",
    [body.label, body.start_date, body.end_date],
  );
  await audit(req.user!.id, "create", "period", rows[0].id, body);
  res.status(201).json(rows[0]);
}));

// Locking freezes the period: scores are stored as snapshots and entries become read-only.
admin.post("/periods/:id/lock", adminOnly, h(async (req, res) => {
  const id = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const p = await client.query("select id, locked from periods where id=$1 for update", [id]);
    if (!p.rows[0]) throw new HttpError(404, "Period not found");
    if (p.rows[0].locked) throw new HttpError(400, "Period is already locked");

    const metrics = (
      await client.query<MetricDef>(
        "select id, key, name, formula_type, weight, cap from metrics where active order by id",
      )
    ).rows;
    const entries = (
      await client.query<EntryRow & { user_id: number }>(
        "select user_id, metric_id, planned, done, bonus from entries where period_id=$1",
        [id],
      )
    ).rows;

    const byUser = new Map<number, EntryRow[]>();
    for (const e of entries) byUser.set(e.user_id, [...(byUser.get(e.user_id) ?? []), e]);

    for (const [userId, rows] of byUser) {
      const s = computeScore(metrics, rows);
      await client.query(
        `insert into score_snapshots (user_id, period_id, total, base, bonus, achievement_pct, breakdown)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (user_id, period_id) do update set total=excluded.total, base=excluded.base,
           bonus=excluded.bonus, achievement_pct=excluded.achievement_pct,
           breakdown=excluded.breakdown, computed_at=now()`,
        [userId, id, s.total, s.base, s.bonus, s.achievement_pct, JSON.stringify(s.breakdown)],
      );
    }
    await client.query("update periods set locked=true where id=$1", [id]);
    await client.query("commit");
    await audit(req.user!.id, "lock", "period", id, { snapshots: byUser.size });
    res.json({ id, locked: true, snapshots: byUser.size });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}));

admin.post("/periods/:id/unlock", adminOnly, h(async (req, res) => {
  const id = Number(req.params.id);
  await pool.query("delete from score_snapshots where period_id=$1", [id]);
  const { rowCount } = await pool.query("update periods set locked=false where id=$1", [id]);
  if (!rowCount) throw new HttpError(404, "Period not found");
  await audit(req.user!.id, "unlock", "period", id);
  res.json({ id, locked: false });
}));

admin.get("/audit", adminOnly, h(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { rows } = await pool.query(
    `select a.id, a.at, a.action, a.entity, a.entity_id, a.detail, u.email as actor
     from audit_log a left join users u on u.id = a.actor_id order by a.id desc limit $1`,
    [limit],
  );
  res.json(rows);
}));
