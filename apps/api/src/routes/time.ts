import { Router } from "express";
import { z } from "zod";
import { canView, requireRole } from "../auth";
import { pool } from "../db";
import { addDays, parseWeek, todayUtc, weekDays } from "../dates";
import type { User } from "../types";
import { dateStr, h, HttpError } from "../util";

export const time = Router();

time.get("/time", h(async (req, res) => {
  const actor = req.user!;
  const q = z.object({ week_start: z.string().optional(), user_id: z.coerce.number().int().optional() }).parse(req.query);
  const ws = parseWeek(q.week_start);
  const days = weekDays(ws);

  let target: Pick<User, "id" | "team_id"> = actor;
  if (q.user_id && q.user_id !== actor.id) {
    const u = await pool.query("select id, team_id from users where id=$1", [q.user_id]);
    if (!u.rows[0]) throw new HttpError(404, "User not found");
    target = u.rows[0];
  }
  if (!canView(actor, target)) throw new HttpError(403, "Not allowed");

  const { rows } = await pool.query(
    `select id, log_date, minutes, task, note from time_logs
     where user_id=$1 and log_date between $2 and $3 order by log_date, id`,
    [target.id, days[0], days[6]],
  );
  const byDay = days.map((d) => rows.filter((r) => r.log_date === d).reduce((s, r) => s + r.minutes, 0));
  res.json({
    week_start: ws,
    week_end: days[6],
    today: todayUtc(),
    days,
    logs: rows,
    by_day: byDay,
    total_minutes: byDay.reduce((s, m) => s + m, 0),
  });
}));

time.post("/time", h(async (req, res) => {
  const b = z
    .object({
      log_date: dateStr,
      minutes: z.number().int().min(1).max(1440),
      task: z.string().trim().min(1).max(120),
      note: z.string().trim().max(300).optional(),
    })
    .parse(req.body);
  if (b.log_date > addDays(todayUtc(), 1)) throw new HttpError(400, "You can't log time for a future day");
  const { rows } = await pool.query(
    "insert into time_logs (user_id, log_date, minutes, task, note) values ($1,$2,$3,$4,$5) returning id, log_date, minutes, task, note",
    [req.user!.id, b.log_date, b.minutes, b.task, b.note ?? null],
  );
  res.status(201).json(rows[0]);
}));

time.delete("/time/:id", h(async (req, res) => {
  const { rowCount } = await pool.query("delete from time_logs where id=$1 and user_id=$2", [
    Number(req.params.id),
    req.user!.id,
  ]);
  if (!rowCount) throw new HttpError(404, "Entry not found");
  res.json({ ok: true });
}));

// Hours per person for a week (managers and admins).
time.get("/time-team", requireRole("manager", "admin"), h(async (req, res) => {
  const actor = req.user!;
  const q = z.object({ week_start: z.string().optional() }).parse(req.query);
  const ws = parseWeek(q.week_start);
  const { rows } = await pool.query(
    `select u.id as user_id, coalesce(nullif(u.name,''), u.email) as name,
            coalesce(sum(t.minutes),0)::int as minutes
     from users u
     left join time_logs t on t.user_id = u.id and t.log_date between $1 and $2
     where u.active and ($3::boolean or u.team_id = $4)
     group by u.id order by name`,
    [ws, addDays(ws, 6), actor.role === "admin", actor.team_id],
  );
  res.json({ week_start: ws, rows });
}));
