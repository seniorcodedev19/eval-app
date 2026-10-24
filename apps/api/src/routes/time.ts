import { Router } from "express";
import { z } from "zod";
import { canView } from "../auth";
import { pool } from "../db";
import { addDays, isoDate, parseWeek, todayUtc, weekDays, weekStartOf } from "../dates";
import type { User } from "../types";
import { dateStr, h, HttpError } from "../util";
import { getReport } from "../week";

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
  const report = await getReport(req.user!.id, weekStartOf(b.log_date));
  if (report && (report.status === "submitted" || report.status === "approved")) {
    throw new HttpError(400, `This week is ${report.status}, so time logs are locked`);
  }
  const { rows } = await pool.query(
    "insert into time_logs (user_id, log_date, minutes, task, note) values ($1,$2,$3,$4,$5) returning id, log_date, minutes, task, note",
    [req.user!.id, b.log_date, b.minutes, b.task, b.note ?? null],
  );
  res.status(201).json(rows[0]);
}));

time.delete("/time/:id", h(async (req, res) => {
  const found = await pool.query<{ log_date: string | Date }>(
    "select log_date from time_logs where id=$1 and user_id=$2",
    [Number(req.params.id), req.user!.id],
  );
  if (!found.rows[0]) throw new HttpError(404, "Entry not found");
  const raw = found.rows[0].log_date;
  const day = raw instanceof Date ? isoDate(raw) : String(raw).slice(0, 10);
  const report = await getReport(req.user!.id, weekStartOf(day));
  if (report && (report.status === "submitted" || report.status === "approved")) {
    throw new HttpError(400, `This week is ${report.status}, so time logs are locked`);
  }
  await pool.query("delete from time_logs where id=$1 and user_id=$2", [Number(req.params.id), req.user!.id]);
  res.json({ ok: true });
}));

// Hours per person per day for a week.
time.get("/time-team", h(async (req, res) => {
  const q = z.object({ week_start: z.string().optional() }).parse(req.query);
  const ws = parseWeek(q.week_start);
  const days = weekDays(ws);
  const teamId = null;
  const { rows } = await pool.query<{
    user_id: number;
    name: string;
    email: string;
    avatar: string | null;
    log_date: string | Date | null;
    minutes: number;
  }>(
    `select u.id as user_id, coalesce(nullif(u.name,''), u.email) as name, u.email, u.avatar,
            t.log_date, coalesce(sum(t.minutes),0)::int as minutes
     from users u
     left join time_logs t on t.user_id = u.id and t.log_date between $1 and $2
     where u.active and u.role <> 'admin' and ($3::int is null or u.team_id = $3)
     group by u.id, t.log_date
     order by name`,
    [days[0], days[6], teamId],
  );
  const byUser = new Map<number, { user_id: number; name: string; email: string; avatar: string | null; by_day: number[] }>();
  const dayKey = (v: string | Date) => (v instanceof Date ? isoDate(v) : String(v).slice(0, 10));
  for (const r of rows) {
    let u = byUser.get(r.user_id);
    if (!u) {
      u = { user_id: r.user_id, name: r.name, email: r.email, avatar: r.avatar, by_day: days.map(() => 0) };
      byUser.set(r.user_id, u);
    }
    if (r.log_date) {
      const i = days.indexOf(dayKey(r.log_date));
      if (i >= 0) u.by_day[i] = r.minutes;
    }
  }
  res.json({
    week_start: ws,
    week_end: days[6],
    today: todayUtc(),
    days,
    rows: [...byUser.values()].map((u) => ({
      ...u,
      minutes: u.by_day.reduce((s, m) => s + m, 0),
    })),
  });
}));
