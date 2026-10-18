import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../auth";
import { pool } from "../db";
import { audit, h, HttpError } from "../util";
import { isTimeTracking, TIME_TRACKING_KEY } from "../scoring";
import { metricsForTeam } from "../week";

export const metrics = Router();

// Members see active metrics for their team. Managers and admins also see inactive ones.
metrics.get("/metrics", h(async (req, res) => {
  const actor = req.user!;
  if (actor.role === "admin") {
    const { rows } = await pool.query(
      `select m.id, m.key, m.name, m.formula_type, m.weight, m.cap, m.target, m.overtime_rate, m.unit, m.team_id, m.active, t.name as team_name
       from metrics m left join teams t on t.id = m.team_id order by (m.key = $1) desc, m.id`,
      [TIME_TRACKING_KEY],
    );
    return res.json(rows);
  }
  res.json(await metricsForTeam(actor.team_id, actor.role === "member"));
}));

const fields = {
  name: z.string().trim().min(1).max(80),
  formula_type: z.enum(["ratio", "count"]),
  weight: z.number().min(0).max(10000),
  cap: z.number().gt(0).max(10),
  target: z.number().min(0).max(1_000_000),
  overtime_rate: z.number().min(0).max(10000),
  unit: z.string().trim().max(24),
  active: z.boolean(),
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "metric";

metrics.post("/metrics", requireRole("admin"), h(async (req, res) => {
  const actor = req.user!;
  const b = z
    .object({ ...fields, team_id: z.number().int().nullable() })
    .partial({ cap: true, unit: true, active: true, team_id: true, overtime_rate: true })
    .parse(req.body);

  let teamId: number | null;
  if (actor.role === "admin") teamId = b.team_id ?? null;
  else {
    if (actor.team_id === null) throw new HttpError(400, "You are not assigned to a team yet");
    teamId = actor.team_id;
  }
  if (b.formula_type === "ratio" && b.target <= 0) {
    throw new HttpError(400, "This metric needs a weekly target above 0");
  }

  const { rows } = await pool.query(
    `insert into metrics (key, name, formula_type, weight, cap, target, overtime_rate, unit, active, team_id, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     returning id, key, name, formula_type, weight, cap, target, overtime_rate, unit, team_id, active`,
    [
      `${slug(b.name)}_${randomBytes(2).toString("hex")}`,
      b.name,
      b.formula_type,
      b.weight,
      b.cap ?? 1.2,
      b.target,
      0,
      b.unit ?? "",
      b.active ?? true,
      teamId,
      actor.id,
    ],
  );
  await audit(actor.id, "create", "metric", rows[0].id, { name: b.name, team_id: teamId });
  res.status(201).json(rows[0]);
}));

metrics.patch("/metrics/:id", requireRole("admin"), h(async (req, res) => {
  const actor = req.user!;
  const id = Number(req.params.id);
  const b = z.object(fields).partial().parse(req.body);

  const cur = await pool.query<{
    key: string;
    team_id: number | null;
    formula_type: string;
    target: number;
  }>("select key, team_id, formula_type, target from metrics where id=$1", [id]);
  if (!cur.rows[0]) throw new HttpError(404, "Metric not found");
  if (actor.role !== "admin" && cur.rows[0].team_id !== actor.team_id) {
    throw new HttpError(403, "Only an admin can change metrics shared by every team");
  }

  const builtin = isTimeTracking(cur.rows[0]);
  if (builtin && b.formula_type) {
    throw new HttpError(400, "Time Tracking is built in. Hours come from the Time page.");
  }
  if (builtin && b.active === false) {
    throw new HttpError(400, "Time Tracking stays on for every team.");
  }

  const nextType = builtin ? "overtime" : (b.formula_type ?? cur.rows[0].formula_type);
  const nextTarget = b.target ?? Number(cur.rows[0].target);
  if ((nextType === "ratio" || nextType === "overtime") && nextTarget <= 0) {
    throw new HttpError(400, "This metric needs a weekly target above 0");
  }

  const { rows } = await pool.query(
    `update metrics set
       name = coalesce($2, name),
       formula_type = case when key = $10 then formula_type else coalesce($3, formula_type) end,
       weight = coalesce($4, weight), cap = coalesce($5, cap),
       target = coalesce($6, target), overtime_rate = coalesce($7, overtime_rate),
       unit = coalesce($8, unit),
       active = case when key = $10 then true else coalesce($9, active) end
     where id = $1
     returning id, key, name, formula_type, weight, cap, target, overtime_rate, unit, team_id, active`,
    [
      id,
      b.name ?? null,
      b.formula_type ?? null,
      b.weight ?? null,
      b.cap ?? null,
      b.target ?? null,
      b.overtime_rate ?? null,
      b.unit ?? null,
      b.active ?? null,
      TIME_TRACKING_KEY,
    ],
  );
  await audit(actor.id, "update", "metric", id, b);
  res.json(rows[0]);
}));
