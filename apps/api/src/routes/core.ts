import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../auth";
import { pool } from "../db";
import { audit, h, HttpError } from "../util";

export const core = Router();

core.get("/me", h(async (req, res) => {
  res.json(req.user);
}));

const profileSql = `select u.id, u.email, u.name, u.role, u.team_id, t.name as team_name, u.job_title, u.bio, u.avatar
                    from users u left join teams t on t.id = u.team_id where u.id = $1`;

core.get("/profile", h(async (req, res) => {
  const { rows } = await pool.query(profileSql, [req.user!.id]);
  res.json(rows[0]);
}));

core.patch("/profile", h(async (req, res) => {
  const b = z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
      job_title: z.string().trim().max(80).optional(),
      bio: z.string().trim().max(500).optional(),
    })
    .parse(req.body);
  await pool.query(
    "update users set name=coalesce($2,name), job_title=coalesce($3,job_title), bio=coalesce($4,bio) where id=$1",
    [req.user!.id, b.name ?? null, b.job_title ?? null, b.bio ?? null],
  );
  const { rows } = await pool.query(profileSql, [req.user!.id]);
  res.json(rows[0]);
}));

const avatarDataUrl = z
  .string()
  .max(350_000)
  .regex(/^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i, "Use a JPEG, PNG, WebP, or GIF image");

core.put("/profile/avatar", h(async (req, res) => {
  const b = z.object({ image: avatarDataUrl }).parse(req.body);
  await pool.query("update users set avatar=$2 where id=$1", [req.user!.id, b.image]);
  await audit(req.user!.id, "update", "avatar", req.user!.id);
  const { rows } = await pool.query(profileSql, [req.user!.id]);
  res.json(rows[0]);
}));

core.delete("/profile/avatar", h(async (req, res) => {
  await pool.query("update users set avatar=null where id=$1", [req.user!.id]);
  await audit(req.user!.id, "delete", "avatar", req.user!.id);
  const { rows } = await pool.query(profileSql, [req.user!.id]);
  res.json(rows[0]);
}));

core.get("/teams", h(async (_req, res) => {
  const { rows } = await pool.query("select id, name from teams order by name");
  res.json(rows);
}));

core.post("/teams", requireRole("admin"), h(async (req, res) => {
  const b = z.object({ name: z.string().trim().min(1).max(80) }).parse(req.body);
  const { rows } = await pool.query("insert into teams (name) values ($1) returning id, name", [b.name]);
  await audit(req.user!.id, "create", "team", rows[0].id, b);
  res.status(201).json(rows[0]);
}));

// Admins see everyone; managers see their team.
core.get("/users", h(async (req, res) => {
  const actor = req.user!;
  if (actor.role === "member") throw new HttpError(403, "Not allowed");
  const { rows } = await pool.query(
    `select id, email, name, role, team_id, active, job_title, bio from users
     where ($1::boolean or team_id = $2) order by name, email`,
    [actor.role === "admin", actor.team_id],
  );
  res.json(rows);
}));

core.patch("/users/:id", requireRole("admin"), h(async (req, res) => {
  const id = Number(req.params.id);
  const b = z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
      email: z.string().trim().email().max(200).optional(),
      job_title: z.string().trim().max(80).optional(),
      bio: z.string().trim().max(500).optional(),
      role: z.enum(["admin", "manager", "member"]).optional(),
      team_id: z.number().int().nullable().optional(),
      active: z.boolean().optional(),
    })
    .parse(req.body);
  if (id === req.user!.id && ((b.role && b.role !== "admin") || b.active === false)) {
    throw new HttpError(400, "You can't remove your own admin access or deactivate yourself");
  }
  if (b.email) {
    const taken = await pool.query("select 1 from users where lower(email)=lower($1) and id<>$2", [b.email, id]);
    if (taken.rowCount) throw new HttpError(400, "That email is already in use");
  }
  const { rows } = await pool.query(
    `update users set
       name = coalesce($2, name),
       email = coalesce($3, email),
       job_title = coalesce($4, job_title),
       bio = coalesce($5, bio),
       role = coalesce($6, role),
       team_id = case when $7::boolean then $8 else team_id end,
       active = coalesce($9, active)
     where id = $1 returning id, email, name, role, team_id, active, job_title, bio`,
    [
      id,
      b.name ?? null,
      b.email?.toLowerCase() ?? null,
      b.job_title ?? null,
      b.bio ?? null,
      b.role ?? null,
      "team_id" in b,
      b.team_id ?? null,
      b.active ?? null,
    ],
  );
  if (!rows[0]) throw new HttpError(404, "User not found");
  await audit(req.user!.id, "update", "user", id, b);
  res.json(rows[0]);
}));

core.get("/audit", requireRole("admin"), h(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const total = await pool.query<{ n: number }>("select count(*)::int as n from audit_log");
  const { rows } = await pool.query(
    `select a.id, a.at, a.action, a.entity, a.entity_id, u.email as actor
     from audit_log a left join users u on u.id = a.actor_id order by a.id desc limit $1 offset $2`,
    [limit, offset],
  );
  res.json({ rows, total: total.rows[0]?.n ?? 0, limit, offset });
}));
