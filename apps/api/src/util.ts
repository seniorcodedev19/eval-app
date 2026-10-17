import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z, ZodError } from "zod";
import { pool } from "./db";
import { validDate } from "./dates";

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

export const dateStr = z.string().refine(validDate, "Use a valid date like 2026-10-12");

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({ error: `Invalid input: ${first?.path.join(".") || "body"} ${first?.message ?? ""}`.trim(), issues: err.issues });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  const code = (err as { code?: string })?.code;
  if (code === "23505") return res.status(409).json({ error: "That already exists" });
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
