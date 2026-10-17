import { Router } from "express";
import { z } from "zod";
import { canEdit, requireRole } from "../auth";
import { pool } from "../db";
import { audit, h, HttpError } from "../util";

export const interviews = Router();

const listSql = `
  select i.id, i.member_id, i.interviewer_id, i.scheduled_at, i.topic, i.status, i.notes,
         coalesce(nullif(m.name,''), m.email) as member_name,
         coalesce(nullif(v.name,''), v.email) as interviewer_name
  from interviews i
  join users m on m.id = i.member_id
  join users v on v.id = i.interviewer_id`;

interviews.get("/interviews", h(async (req, res) => {
  const a = req.user!;
  let where = "";
  let params: unknown[] = [];
  if (a.role === "manager") {
    where = "where m.team_id = $1 or i.interviewer_id = $2";
    params = [a.team_id, a.id];
  } else if (a.role === "member") {
    where = "where i.member_id = $1";
    params = [a.id];
  }
  const { rows } = await pool.query(`${listSql} ${where} order by i.scheduled_at desc limit 100`, params);
  res.json(rows);
}));

async function memberOf(id: number) {
  const { rows } = await pool.query("select id, team_id from users where id=$1", [id]);
  if (!rows[0]) throw new HttpError(404, "Person not found");
  return rows[0] as { id: number; team_id: number | null };
}

interviews.post("/interviews", requireRole("manager", "admin"), h(async (req, res) => {
  const actor = req.user!;
  const b = z
    .object({
      member_id: z.number().int(),
      scheduled_at: z.string().datetime(),
      topic: z.string().trim().min(1).max(120).default("1:1 review"),
    })
    .parse(req.body);
  if (b.member_id === actor.id) throw new HttpError(400, "Pick someone else to interview");
  const member = await memberOf(b.member_id);
  if (!canEdit(actor, member)) throw new HttpError(403, "You can only schedule interviews with people on your team");

  const { rows } = await pool.query(
    "insert into interviews (member_id, interviewer_id, scheduled_at, topic) values ($1,$2,$3,$4) returning id",
    [b.member_id, actor.id, b.scheduled_at, b.topic],
  );
  await audit(actor.id, "create", "interview", rows[0].id, { member_id: b.member_id });
  res.status(201).json(rows[0]);
}));

interviews.patch("/interviews/:id", requireRole("manager", "admin"), h(async (req, res) => {
  const actor = req.user!;
  const id = Number(req.params.id);
  const b = z
    .object({
      scheduled_at: z.string().datetime(),
      topic: z.string().trim().min(1).max(120),
      status: z.enum(["scheduled", "done", "cancelled"]),
      notes: z.string().trim().max(4000),
    })
    .partial()
    .parse(req.body);

  const cur = await pool.query("select member_id from interviews where id=$1", [id]);
  if (!cur.rows[0]) throw new HttpError(404, "Interview not found");
  if (!canEdit(actor, await memberOf(cur.rows[0].member_id))) throw new HttpError(403, "Not allowed");

  await pool.query(
    `update interviews set scheduled_at=coalesce($2,scheduled_at), topic=coalesce($3,topic),
       status=coalesce($4,status), notes=coalesce($5,notes) where id=$1`,
    [id, b.scheduled_at ?? null, b.topic ?? null, b.status ?? null, b.notes ?? null],
  );
  await audit(actor.id, "update", "interview", id, { status: b.status });
  res.json({ ok: true });
}));
