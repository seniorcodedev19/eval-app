import { Router } from "express";
import { z } from "zod";
import { canEdit, canView } from "../auth";
import { pool } from "../db";
import { audit, h, HttpError, scoreFor } from "../util";
import type { User } from "../types";

export const data = Router();

async function getTarget(userId: number) {
  const { rows } = await pool.query<User>(
    "select id, email, name, role, team_id, active from users where id=$1",
    [userId],
  );
  if (!rows[0]) throw new HttpError(404, "User not found");
  return rows[0];
}

async function getPeriod(periodId: number) {
  const { rows } = await pool.query(
    "select id, label, start_date, end_date, locked from periods where id=$1",
    [periodId],
  );
  if (!rows[0]) throw new HttpError(404, "Period not found");
  return rows[0] as { id: number; label: string; start_date: string; end_date: string; locked: boolean };
}

const ids = z.object({ user_id: z.coerce.number().int(), period_id: z.coerce.number().int() });

data.get("/me", h(async (req, res) => {
  res.json(req.user);
}));

data.get("/entries", h(async (req, res) => {
  const q = ids.parse(req.query);
  const target = await getTarget(q.user_id);
  if (!canView(req.user!, target)) throw new HttpError(403, "Not allowed");
  const { rows } = await pool.query(
    `select metric_id, planned, done, bonus, note, updated_at
     from entries where user_id=$1 and period_id=$2`,
    [q.user_id, q.period_id],
  );
  res.json(rows);
}));

const entryBody = z.object({
  user_id: z.number().int(),
  period_id: z.number().int(),
  metric_id: z.number().int(),
  planned: z.number().min(0).max(1_000_000),
  done: z.number().min(0).max(1_000_000),
  bonus: z.number().min(-10_000).max(10_000).default(0),
  note: z.string().max(500).nullable().optional(),
});

data.put("/entries", h(async (req, res) => {
  const b = entryBody.parse(req.body);
  const target = await getTarget(b.user_id);
  if (!canEdit(req.user!, target)) throw new HttpError(403, "Only the team's manager or an admin can edit entries");
  const period = await getPeriod(b.period_id);
  if (period.locked) throw new HttpError(400, "This period is locked");

  const { rows } = await pool.query(
    `insert into entries (user_id, period_id, metric_id, planned, done, bonus, note, updated_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (user_id, period_id, metric_id) do update set
       planned=excluded.planned, done=excluded.done, bonus=excluded.bonus,
       note=excluded.note, updated_by=excluded.updated_by, updated_at=now()
     returning metric_id, planned, done, bonus, note, updated_at`,
    [b.user_id, b.period_id, b.metric_id, b.planned, b.done, b.bonus, b.note ?? null, req.user!.id],
  );
  await audit(req.user!.id, "upsert", "entry", `${b.user_id}/${b.period_id}/${b.metric_id}`, {
    planned: b.planned,
    done: b.done,
    bonus: b.bonus,
  });
  res.json(rows[0]);
}));

data.get("/scores", h(async (req, res) => {
  const q = ids.parse(req.query);
  const target = await getTarget(q.user_id);
  if (!canView(req.user!, target)) throw new HttpError(403, "Not allowed");
  const period = await getPeriod(q.period_id);
  const score = await scoreFor(target.id, period);
  res.json({ user: target, period, score });
}));

// Totals per period for one user (for the trend view).
data.get("/trend", h(async (req, res) => {
  const q = z.object({ user_id: z.coerce.number().int() }).parse(req.query);
  const target = await getTarget(q.user_id);
  if (!canView(req.user!, target)) throw new HttpError(403, "Not allowed");
  const { rows: periods } = await pool.query(
    "select id, label, start_date, end_date, locked from periods order by start_date asc",
  );
  const out = [];
  for (const p of periods) {
    const s = await scoreFor(target.id, p);
    if (s.breakdown.length > 0) {
      out.push({ period_id: p.id, label: p.label, total: s.total, achievement_pct: s.achievement_pct });
    }
  }
  res.json(out);
}));

async function teamRows(actor: User, periodId: number, teamIdParam?: number) {
  if (actor.role === "member") throw new HttpError(403, "Not allowed");
  const teamId = actor.role === "admin" ? teamIdParam ?? null : actor.team_id;
  if (actor.role === "manager" && teamId === null) throw new HttpError(400, "You are not assigned to a team");
  const period = await getPeriod(periodId);
  const { rows: users } = await pool.query<User>(
    `select id, email, name, role, team_id, active from users
     where active and ($1::int is null or team_id = $1) order by name, email`,
    [teamId],
  );
  const result = [];
  for (const u of users) {
    const s = await scoreFor(u.id, period);
    result.push({
      user_id: u.id,
      name: u.name || u.email,
      email: u.email,
      team_id: u.team_id,
      role: u.role,
      has_data: s.breakdown.length > 0,
      total: s.total,
      bonus: s.bonus,
      achievement_pct: s.achievement_pct,
    });
  }
  return { period, rows: result };
}

data.get("/team-scores", h(async (req, res) => {
  const q = z
    .object({ period_id: z.coerce.number().int(), team_id: z.coerce.number().int().optional() })
    .parse(req.query);
  res.json(await teamRows(req.user!, q.period_id, q.team_id));
}));

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

data.get("/export.csv", h(async (req, res) => {
  const q = z
    .object({ period_id: z.coerce.number().int(), team_id: z.coerce.number().int().optional() })
    .parse(req.query);
  const { period, rows } = await teamRows(req.user!, q.period_id, q.team_id);
  const header = ["name", "email", "role", "total", "bonus", "achievement_pct"];
  const lines = [header.join(",")].concat(
    rows.map((r) => [r.name, r.email, r.role, r.total, r.bonus, r.achievement_pct ?? ""].map(csvCell).join(",")),
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="scores-${period.label}.csv"`);
  res.send(lines.join("\n"));
}));
