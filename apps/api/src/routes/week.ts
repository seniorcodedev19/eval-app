import { Router } from "express";
import { z } from "zod";
import { canEdit, canView, requireRole } from "../auth";
import { pool } from "../db";
import { addDays, parseWeek, todayUtc, weekStartOf } from "../dates";
import type { User } from "../types";
import { audit, dateStr, h, HttpError } from "../util";
import { isTimeTracking } from "../scoring";
import { getReport, publicReport, weekSnapshot } from "../week";

export const week = Router();
const r2 = (n: number) => Math.round(n * 100) / 100;

async function getUser(id: number) {
  const { rows } = await pool.query<User>(
    "select id, email, name, role, team_id, active, avatar from users where id=$1",
    [id],
  );
  if (!rows[0]) throw new HttpError(404, "User not found");
  return rows[0];
}

// One person's week: metrics, daily values, score, report status.
week.get("/week", h(async (req, res) => {
  const actor = req.user!;
  const q = z
    .object({ week_start: z.string().optional(), user_id: z.coerce.number().int().optional() })
    .parse(req.query);
  const ws = parseWeek(q.week_start);
  const target = q.user_id && q.user_id !== actor.id ? await getUser(q.user_id) : actor;
  if (!canView(actor, target)) throw new HttpError(403, "Not allowed");

  const snap = await weekSnapshot(target, ws);
  const status = snap.report?.status ?? "draft";
  res.json({
    week_start: ws,
    week_end: snap.days[6],
    today: todayUtc(),
    user: { id: target.id, name: target.name, email: target.email, team_id: target.team_id, avatar: target.avatar },
    status,
    report: publicReport(snap.report),
    editable: target.id === actor.id && (status === "draft" || status === "returned"),
    metrics: snap.metrics,
    days: snap.days,
    daily: snap.daily,
    day_points: snap.day_points,
    time_hours: snap.time_hours,
    score: snap.score,
  });
}));

// Save (or clear) one day's value for one metric. Members only edit their own, until they submit.
week.put("/daily", h(async (req, res) => {
  const actor = req.user!;
  const b = z
    .object({
      metric_id: z.number().int(),
      entry_date: dateStr,
      value: z.number().min(0).max(1_000_000).nullable(),
    })
    .parse(req.body);

  if (b.entry_date > addDays(todayUtc(), 1)) throw new HttpError(400, "You can't enter results for a future day");
  const report = await getReport(actor.id, weekStartOf(b.entry_date));
  if (report && (report.status === "submitted" || report.status === "approved")) {
    throw new HttpError(400, `This week is ${report.status}, so entries are locked`);
  }
  const m = await pool.query<{ id: number; key: string; formula_type: string }>(
    "select id, key, formula_type from metrics where id=$1 and active and (team_id is null or team_id = $2)",
    [b.metric_id, actor.team_id],
  );
  if (!m.rows[0]) throw new HttpError(404, "Metric not found");
  if (isTimeTracking(m.rows[0])) {
    throw new HttpError(400, "Working time comes from Time tracking, not this form");
  }

  if (!b.value) {
    await pool.query("delete from daily_entries where user_id=$1 and metric_id=$2 and entry_date=$3", [
      actor.id,
      b.metric_id,
      b.entry_date,
    ]);
  } else {
    await pool.query(
      `insert into daily_entries (user_id, metric_id, entry_date, value) values ($1,$2,$3,$4)
       on conflict (user_id, metric_id, entry_date) do update set value = excluded.value, updated_at = now()`,
      [actor.id, b.metric_id, b.entry_date, b.value],
    );
  }
  res.json({ ok: true });
}));

// One weekly total per metric (not overtime — those hours come from time_logs).
week.put("/weekly", h(async (req, res) => {
  const actor = req.user!;
  const b = z
    .object({
      week_start: dateStr,
      entries: z.array(z.object({ metric_id: z.number().int(), value: z.number().min(0).max(1_000_000).nullable() })),
    })
    .parse(req.body);
  const ws = weekStartOf(b.week_start);
  if (ws > todayUtc()) throw new HttpError(400, "That week hasn't started yet");
  const report = await getReport(actor.id, ws);
  if (report && (report.status === "submitted" || report.status === "approved")) {
    throw new HttpError(400, `This week is ${report.status}, so entries are locked`);
  }

  for (const e of b.entries) {
    const m = await pool.query<{ id: number; key: string; formula_type: string }>(
      "select id, key, formula_type from metrics where id=$1 and active and (team_id is null or team_id = $2)",
      [e.metric_id, actor.team_id],
    );
    if (!m.rows[0]) throw new HttpError(404, "Metric not found");
    if (isTimeTracking(m.rows[0])) continue;

    await pool.query(
      "delete from daily_entries where user_id=$1 and metric_id=$2 and entry_date between $3 and $4",
      [actor.id, e.metric_id, ws, addDays(ws, 6)],
    );
    if (e.value) {
      await pool.query(
        `insert into daily_entries (user_id, metric_id, entry_date, value) values ($1,$2,$3,$4)
         on conflict (user_id, metric_id, entry_date) do update set value = excluded.value, updated_at = now()`,
        [actor.id, e.metric_id, ws, e.value],
      );
    }
  }
  res.json({ ok: true });
}));

week.post("/report/submit", h(async (req, res) => {
  const actor = req.user!;
  const b = z.object({ week_start: dateStr, summary: z.string().trim().max(2000).optional() }).parse(req.body);
  const ws = weekStartOf(b.week_start);
  if (ws > todayUtc()) throw new HttpError(400, "That week hasn't started yet");

  const existing = await getReport(actor.id, ws);
  if (existing && (existing.status === "submitted" || existing.status === "approved")) {
    throw new HttpError(400, `This week is already ${existing.status}`);
  }
  const snap = await weekSnapshot(actor, ws);
  if (!snap.hasData) throw new HttpError(400, "Add at least one result or some tracked time before submitting");

  await pool.query(
    `insert into weekly_reports (user_id, week_start, status, summary, submitted_at)
     values ($1,$2,'submitted',$3,now())
     on conflict (user_id, week_start) do update set
       status='submitted', summary=excluded.summary, submitted_at=now(),
       reviewer_id=null, reviewed_at=null, review_comment=null`,
    [actor.id, ws, b.summary ?? null],
  );
  await audit(actor.id, "submit", "report", `${actor.id}/${ws}`);
  res.json({ ok: true, status: "submitted" });
}));

// Reports waiting for this manager (or admin) to review.
week.get("/review-queue", requireRole("manager", "admin"), h(async (req, res) => {
  const actor = req.user!;
  const { rows } = await pool.query(
    `select r.id as report_id, r.user_id, r.week_start, r.summary, r.submitted_at, u.name, u.email, u.avatar, u.team_id
     from weekly_reports r join users u on u.id = r.user_id
     where r.status = 'submitted' and u.role <> 'admin' and u.id <> $1 and ($2::boolean or u.team_id = $3)
     order by r.submitted_at`,
    [actor.id, actor.role === "admin", actor.team_id],
  );
  const out = [];
  for (const r of rows) {
    const snap = await weekSnapshot({ id: r.user_id, team_id: r.team_id }, r.week_start);
    out.push({ ...r, week_end: snap.days[6], score: snap.live });
  }
  res.json(out);
}));

week.post("/reports/:id/review", requireRole("manager", "admin"), h(async (req, res) => {
  const actor = req.user!;
  const b = z
    .object({
      decision: z.enum(["approve", "return"]),
      comment: z.string().trim().max(1000).optional(),
      bonus: z.number().min(-100).max(100).default(0),
    })
    .parse(req.body);

  const found = await pool.query(
    `select r.id, r.user_id, r.week_start, r.status, u.team_id
     from weekly_reports r join users u on u.id = r.user_id where r.id = $1`,
    [Number(req.params.id)],
  );
  const rep = found.rows[0];
  if (!rep) throw new HttpError(404, "Report not found");
  if (rep.user_id === actor.id) throw new HttpError(403, "You can't review your own report");
  if (!canEdit(actor, { id: rep.user_id, team_id: rep.team_id })) throw new HttpError(403, "Not allowed");
  if (rep.status !== "submitted") throw new HttpError(400, "This report is not waiting for review");

  if (b.decision === "return") {
    if (!b.comment) throw new HttpError(400, "Say what needs to change when you return a report");
    await pool.query(
      `update weekly_reports set status='returned', review_comment=$2, reviewer_id=$3, reviewed_at=now() where id=$1`,
      [rep.id, b.comment, actor.id],
    );
    await audit(actor.id, "return", "report", rep.id);
    return res.json({ ok: true, status: "returned" });
  }

  const snap = await weekSnapshot({ id: rep.user_id, team_id: rep.team_id }, rep.week_start);
  const total = r2(snap.live.total + b.bonus);
  await pool.query(
    `update weekly_reports set status='approved', review_comment=$2, reviewer_id=$3, reviewed_at=now(),
       bonus=$4, total=$5, achievement_pct=$6, breakdown=$7 where id=$1`,
    [rep.id, b.comment ?? null, actor.id, b.bonus, total, snap.live.achievement_pct, JSON.stringify(snap.live.breakdown)],
  );
  await audit(actor.id, "approve", "report", rep.id, { total, bonus: b.bonus });
  res.json({ ok: true, status: "approved", total });
}));

// Admins can move a week between in progress, review, approved, and returned.
week.patch("/week/status", requireRole("admin"), h(async (req, res) => {
  const actor = req.user!;
  const b = z
    .object({
      user_id: z.number().int(),
      week_start: dateStr,
      status: z.enum(["draft", "submitted", "approved", "returned"]),
      comment: z.string().trim().max(1000).optional(),
    })
    .parse(req.body);
  const ws = weekStartOf(b.week_start);
  const target = await getUser(b.user_id);
  const snap = await weekSnapshot(target, ws);

  if (b.status === "approved") {
    if (!snap.hasData && !snap.report) throw new HttpError(400, "There is nothing to approve for this week");
    const bonus = snap.report?.bonus ?? 0;
    const total = r2(snap.live.total + bonus);
    await pool.query(
      `insert into weekly_reports (user_id, week_start, status, reviewer_id, reviewed_at, review_comment, bonus, total, achievement_pct, breakdown)
       values ($1,$2,'approved',$3,now(),$4,$5,$6,$7,$8)
       on conflict (user_id, week_start) do update set
         status='approved', reviewer_id=$3, reviewed_at=now(), review_comment=$4,
         total=$6, achievement_pct=$7, breakdown=$8`,
      [
        target.id,
        ws,
        actor.id,
        b.comment ?? snap.report?.review_comment ?? null,
        bonus,
        total,
        snap.live.achievement_pct,
        JSON.stringify(snap.live.breakdown),
      ],
    );
  } else {
    await pool.query(
      `insert into weekly_reports (user_id, week_start, status, summary, submitted_at, reviewer_id, reviewed_at, review_comment, bonus, total, achievement_pct, breakdown)
       values ($1,$2,$3,$4,$5,$6,now(),$7,0,null,null,null)
       on conflict (user_id, week_start) do update set
         status=$3,
         submitted_at=case when $3='submitted' then now() else weekly_reports.submitted_at end,
         reviewer_id=$6, reviewed_at=now(), review_comment=$7,
         total=null, achievement_pct=null, breakdown=null`,
      [
        target.id,
        ws,
        b.status,
        snap.report?.summary ?? null,
        b.status === "submitted" ? new Date() : (snap.report?.submitted_at ?? null),
        actor.id,
        b.comment ?? snap.report?.review_comment ?? null,
      ],
    );
  }
  await audit(actor.id, "status", "report", `${target.id}/${ws}`, { status: b.status });
  res.json({ ok: true, status: b.status });
}));

async function teamWeekRows(actor: User, ws: string, teamIdParam?: number) {
  const teamId = actor.role === "admin" ? (teamIdParam ?? null) : null;
  const { rows: users } = await pool.query<User & { team_name: string | null }>(
    `select u.id, u.email, u.name, u.role, u.team_id, u.active, u.avatar, t.name as team_name
     from users u left join teams t on t.id = u.team_id
     where u.active and u.role <> 'admin' and ($1::int is null or u.team_id = $1) order by u.name, u.email`,
    [teamId],
  );
  const rows = [];
  for (const u of users) {
    const s = await weekSnapshot(u, ws);
    const status = s.report?.status ?? "draft";
    const units = new Map(s.metrics.map((m) => [m.id, m.unit]));
    const metric_points = Object.values(
      s.score.breakdown.reduce<
        Record<
          number,
          {
            id: number;
            name: string;
            points: number;
            planned: number;
            done: number;
            ratio: number | null;
            weight: number;
            formula_type: string;
            unit: string;
          }
        >
      >((acc, b) => {
        const name = b.part === "bonus" ? b.name.replace(/ overtime$/, "") : b.name;
        const cur = acc[b.metric_id] ?? {
          id: b.metric_id,
          name,
          points: 0,
          planned: 0,
          done: 0,
          ratio: null as number | null,
          weight: Number(b.weight),
          formula_type: b.formula_type,
          unit: units.get(b.metric_id) ?? "",
        };
        cur.points += Number(b.contribution);
        cur.done += Number(b.done);
        if (b.part !== "bonus") {
          cur.planned = Number(b.planned);
          cur.ratio = b.ratio;
          cur.weight = Number(b.weight);
          cur.formula_type = b.formula_type;
        }
        acc[b.metric_id] = cur;
        return acc;
      }, {}),
    );
    rows.push({
      user_id: u.id,
      name: u.name || u.email,
      email: u.email,
      avatar: u.avatar ?? null,
      role: u.role,
      status,
      report_id: s.report?.id ?? null,
      has_data: s.hasData,
      total: s.score.total,
      bonus: s.score.bonus,
      achievement_pct: s.score.achievement_pct,
      day_points: s.day_points,
      team_id: u.team_id,
      team_name: u.team_name,
      metric_points,
    });
  }
  return rows;
}

week.get("/team-week", h(async (req, res) => {
  const q = z.object({ week_start: z.string().optional(), team_id: z.coerce.number().int().optional() }).parse(req.query);
  const ws = parseWeek(q.week_start);
  res.json({ week_start: ws, week_end: addDays(ws, 6), rows: await teamWeekRows(req.user!, ws, q.team_id) });
}));

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

week.get("/export.csv", h(async (req, res) => {
  const q = z.object({ week_start: z.string().optional(), team_id: z.coerce.number().int().optional() }).parse(req.query);
  const ws = parseWeek(q.week_start);
  const rows = await teamWeekRows(req.user!, ws, q.team_id);
  const lines = [["name", "email", "role", "status", "total", "bonus", "achievement_pct"].join(",")].concat(
    rows.map((r) => [r.name, r.email, r.role, r.status, r.total, r.bonus, r.achievement_pct ?? ""].map(csvCell).join(",")),
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="week-${ws}.csv"`);
  res.send(lines.join("\n"));
}));

// Last 8 weeks of totals for one person.
week.get("/history", h(async (req, res) => {
  const actor = req.user!;
  const q = z.object({ user_id: z.coerce.number().int().optional() }).parse(req.query);
  const target = q.user_id && q.user_id !== actor.id ? await getUser(q.user_id) : actor;
  if (!canView(actor, target)) throw new HttpError(403, "Not allowed");
  const thisWeek = weekStartOf(todayUtc());
  const out = [];
  for (let i = 7; i >= 0; i--) {
    const ws = addDays(thisWeek, -7 * i);
    const s = await weekSnapshot(target, ws);
    if (s.hasData || s.report) {
      out.push({
        week_start: ws,
        label: ws.slice(5),
        total: s.score.total,
        achievement_pct: s.score.achievement_pct,
        status: s.report?.status ?? "draft",
      });
    }
  }
  res.json(out);
}));
