import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { hashPassword, verifyPassword } from "../password";
import { h, HttpError } from "../util";

export const publicAuth = Router();

const signupBody = z.object({
  email: z.string().trim().email().transform((s) => s.toLowerCase()),
  password: z.string().min(8, "must be at least 8 characters").max(200),
  name: z.string().trim().max(80).optional().default(""),
});

const loginBody = z.object({
  email: z.string().trim().email().transform((s) => s.toLowerCase()),
  password: z.string().min(1).max(200),
});

publicAuth.post(
  "/auth/signup",
  h(async (req, res) => {
    const { email, password, name } = signupBody.parse(req.body);
    const display = name || email.split("@")[0];
    const password_hash = await hashPassword(password);
    try {
      const { rows } = await pool.query(
        `insert into users (email, name, role, password_hash, team_id)
         values ($1, $2, 'member', $3, (select id from teams order by id limit 1))
         returning id, email, name`,
        [email, display, password_hash],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "23505") throw new HttpError(409, "An account with that email already exists");
      throw err;
    }
  }),
);

publicAuth.post(
  "/auth/login",
  h(async (req, res) => {
    const { email, password } = loginBody.parse(req.body);
    const { rows } = await pool.query<{
      id: number;
      email: string;
      name: string;
      active: boolean;
      password_hash: string | null;
    }>("select id, email, name, active, password_hash from users where email=$1", [email]);
    const user = rows[0];
    if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) {
      throw new HttpError(401, "Invalid email or password");
    }
    if (!user.active) throw new HttpError(403, "Account is deactivated");
    res.json({ id: user.id, email: user.email, name: user.name });
  }),
);
