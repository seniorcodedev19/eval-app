import { Router } from "express";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { requireRole } from "../auth";
import { encryptSecret } from "../crypto";
import { pool } from "../db";
import { postSlackReply } from "../slackInbound";
import { startSlackSocket } from "../slackSocket";
import { linkSlackUser, openaiKeyFor, slackAppCreds, slackAppToken, slackSigningSecret } from "../slackTokens";
import { runAgentTurn } from "../agentLoop";
import { h, HttpError } from "../util";

export const agent = Router();

const SLACK_USER_SCOPES =
  "search:read,channels:history,groups:history,im:history,mpim:history,channels:read,groups:read,im:read,mpim:read,chat:write,users:read,users:read.email";
const SLACK_BOT_SCOPES =
  "app_mentions:read,chat:write,im:history,im:read,im:write,users:read,users:read.email,channels:history,channels:read,groups:history,groups:read,mpim:history,mpim:read";

function slackRedirectUri() {
  return process.env.SLACK_REDIRECT_URI || `${process.env.WEB_ORIGIN || "http://localhost:3000"}/api/slack/callback`;
}

function publicApiOrigin() {
  const explicit = (process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return `http://localhost:${process.env.PORT || 4000}`;
}


type SlackAuth = { ok: boolean; error?: string; user_id?: string; team_id?: string; team?: string; user?: string };

async function slackAuthTest(token: string): Promise<SlackAuth> {
  const res = await fetch("https://slack.com/api/auth.test", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
  });
  return (await res.json()) as SlackAuth;
}

async function saveSlackUserToken(evalUserId: number, token: string, scopes: string) {
  let auth: SlackAuth;
  try {
    auth = await slackAuthTest(token);
  } catch {
    throw new HttpError(502, "Could not reach Slack. Check the token and try again.");
  }
  if (!auth.ok || !auth.user_id || !auth.team_id) {
    throw new HttpError(400, auth.error === "invalid_auth" ? "Slack rejected that token." : `Slack: ${auth.error ?? "token did not work"}`);
  }
  let enc: string;
  try {
    enc = encryptSecret(token);
  } catch {
    throw new HttpError(500, "AGENT_TOKEN_SECRET or API_JWT_SECRET must be set (16+ characters)");
  }
  await pool.query(
    `insert into slack_connections (eval_user_id, slack_user_id, slack_team_id, user_token_enc, scopes, connected_at)
     values ($1,$2,$3,$4,$5, now())
     on conflict (eval_user_id) do update set
       slack_user_id=excluded.slack_user_id,
       slack_team_id=excluded.slack_team_id,
       user_token_enc=excluded.user_token_enc,
       scopes=excluded.scopes,
       connected_at=now()`,
    [evalUserId, auth.user_id, auth.team_id, enc, scopes],
  );
  return {
    connected: true as const,
    slack_user_id: auth.user_id,
    slack_team_id: auth.team_id,
    team: auth.team ?? null,
    user: auth.user ?? null,
  };
}

agent.get("/agent/slack/status", h(async (req, res) => {
  const [{ rows }, openai] = await Promise.all([
    pool.query<{
      slack_user_id: string;
      slack_team_id: string;
      connected_at: Date;
    }>("select slack_user_id, slack_team_id, connected_at from slack_connections where eval_user_id=$1", [req.user!.id]),
    openaiKeyFor(req.user!.id),
  ]);
  const row = rows[0];
  res.json({
    connected: Boolean(row),
    slack_user_id: row?.slack_user_id ?? null,
    slack_team_id: row?.slack_team_id ?? null,
    connected_at: row?.connected_at ?? null,
    openai_configured: Boolean(openai),
  });
}));

agent.post("/agent/slack/token", requireRole("admin"), h(async (req, res) => {
  const { token } = z.object({ token: z.string().trim().min(10).max(500) }).parse(req.body);
  if (!/^xoxp-/i.test(token)) {
    throw new HttpError(400, "Paste your Slack user token (starts with xoxp-)");
  }
  res.json(await saveSlackUserToken(req.user!.id, token, "manual"));
}));

async function saveBotInstall(token: string, teamId?: string, botUserId?: string | null) {
  const auth = await slackAuthTest(token).catch(() => {
    throw new HttpError(502, "Could not reach Slack. Check the token and try again.");
  });
  if (!auth.ok || !auth.team_id) {
    throw new HttpError(400, auth.error === "invalid_auth" ? "Slack rejected that token." : `Slack: ${auth.error ?? "token did not work"}`);
  }
  let enc: string;
  try {
    enc = encryptSecret(token);
  } catch {
    throw new HttpError(500, "AGENT_TOKEN_SECRET or API_JWT_SECRET must be set (16+ characters)");
  }
  await pool.query(
    `insert into slack_app_install (slack_team_id, bot_user_id, bot_token_enc, installed_at)
     values ($1,$2,$3,now())
     on conflict (slack_team_id) do update set
       bot_user_id=excluded.bot_user_id,
       bot_token_enc=excluded.bot_token_enc,
       installed_at=now()`,
    [teamId || auth.team_id, botUserId ?? auth.user_id ?? null, enc],
  );
  return { installed: true as const, slack_team_id: teamId || auth.team_id, bot_user_id: botUserId ?? auth.user_id ?? null };
}

agent.get("/agent/slack/install", requireRole("admin"), h(async (req, res) => {
  const safe = async <T>(fn: () => Promise<{ rows: T[] }>) => {
    try {
      return await fn();
    } catch (err) {
      if ((err as { code?: string }).code === "42P01") return { rows: [] as T[] };
      throw err;
    }
  };
  const [{ rows }, cfg, creds, signing, appTok, openaiOrg, linked] = await Promise.all([
    safe(() =>
      pool.query<{ slack_team_id: string; bot_user_id: string | null; installed_at: Date }>(
        "select slack_team_id, bot_user_id, installed_at from slack_app_install order by installed_at desc",
      ),
    ),
    safe(() =>
      pool.query<{ client_id: string; client_secret_enc: string | null }>(
        "select client_id, client_secret_enc from slack_app_config where id=1",
      ),
    ),
    slackAppCreds(),
    slackSigningSecret(),
    slackAppToken(),
    openaiKeyFor(),
    safe(() =>
      pool.query<{ n: number }>("select 1 as n from slack_connections where eval_user_id=$1", [req.user!.id]),
    ),
  ]);
  res.json({
    installed: rows.length > 0,
    installer_linked: linked.rows.length > 0,
    slack_oauth: Boolean(creds),
    client_id: cfg.rows[0]?.client_id || process.env.SLACK_CLIENT_ID || "",
    has_secret: Boolean(cfg.rows[0]?.client_secret_enc || process.env.SLACK_CLIENT_SECRET),
    has_signing_secret: Boolean(signing),
    has_app_token: Boolean(appTok),
    openai_configured: Boolean(openaiOrg),
    workspaces: rows,
    redirect_uri: slackRedirectUri(),
    events_url: process.env.SLACK_EVENTS_URL || `${publicApiOrigin()}/agent/slack/events`,
  });
}));

agent.post("/agent/slack/install/credentials", requireRole("admin"), h(async (req, res) => {
  const b = z
    .object({
      client_id: z.string().trim().min(1).max(64),
      client_secret: z.string().trim().max(80).optional(),
      signing_secret: z.string().trim().max(80).optional(),
      app_token: z.string().trim().max(200).optional(),
    })
    .parse(req.body);
  if (b.app_token && !/^xapp-/i.test(b.app_token)) {
    throw new HttpError(400, "App-level token starts with xapp- (Basic Information → App-Level Tokens)");
  }
  const cur = await pool.query<{
    client_secret_enc: string | null;
    signing_secret_enc: string | null;
    app_token_enc: string | null;
  }>("select client_secret_enc, signing_secret_enc, app_token_enc from slack_app_config where id=1");
  const enc = (plain: string | undefined, prev: string | null) => {
    if (!plain) return prev;
    try {
      return encryptSecret(plain);
    } catch {
      throw new HttpError(500, "AGENT_TOKEN_SECRET or API_JWT_SECRET must be set (16+ characters)");
    }
  };
  const secretEnc = enc(b.client_secret, cur.rows[0]?.client_secret_enc ?? null);
  const signingEnc = enc(b.signing_secret, cur.rows[0]?.signing_secret_enc ?? null);
  const appTokEnc = enc(b.app_token, cur.rows[0]?.app_token_enc ?? null);
  if (!secretEnc && !process.env.SLACK_CLIENT_SECRET) {
    throw new HttpError(400, "Paste the Slack Client Secret");
  }
  await pool.query(
    `insert into slack_app_config (id, client_id, client_secret_enc, signing_secret_enc, app_token_enc, updated_at)
     values (1,$1,$2,$3,$4,now())
     on conflict (id) do update set client_id=excluded.client_id,
       client_secret_enc=coalesce(excluded.client_secret_enc, slack_app_config.client_secret_enc),
       signing_secret_enc=coalesce(excluded.signing_secret_enc, slack_app_config.signing_secret_enc),
       app_token_enc=coalesce(excluded.app_token_enc, slack_app_config.app_token_enc),
       updated_at=now()`,
    [b.client_id, secretEnc, signingEnc, appTokEnc],
  );
  void startSlackSocket();
  res.json({
    client_id: b.client_id,
    has_secret: true,
    slack_oauth: true,
    has_signing_secret: Boolean(signingEnc || process.env.SLACK_SIGNING_SECRET),
    has_app_token: Boolean(appTokEnc || process.env.SLACK_APP_TOKEN),
  });
}));

agent.post("/agent/slack/install/token", requireRole("admin"), h(async (req, res) => {
  const { token } = z.object({ token: z.string().trim().min(10).max(500) }).parse(req.body);
  if (!/^xoxb-/i.test(token)) throw new HttpError(400, "Paste the Slack bot token (starts with xoxb-)");
  res.json(await saveBotInstall(token));
}));

agent.delete("/agent/slack/install", requireRole("admin"), h(async (_req, res) => {
  await pool.query("delete from slack_app_install");
  res.json({ installed: false });
}));

async function slackAuthorizeUrl(uid: number, kind: "install" | "user") {
  const creds = await slackAppCreds();
  if (!creds) {
    throw new HttpError(
      400,
      kind === "install"
        ? "Save the Slack Client ID and Client Secret on this page first."
        : "An admin must save Slack app credentials first (Admin → Agent connect).",
    );
  }
  if (kind === "user") {
    const installed = await pool.query("select 1 from slack_app_install limit 1");
    if (!installed.rowCount && !process.env.SLACK_BOT_TOKEN) {
      throw new HttpError(400, "An admin needs to Connect to Slack under Admin → Agent connect first.");
    }
  }
  const state = await new SignJWT({ uid, kind })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(process.env.API_JWT_SECRET ?? ""));
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", creds.client_id);
  url.searchParams.set("redirect_uri", slackRedirectUri());
  url.searchParams.set("state", state);
  // Slack's authorize page errors ("There's been a glitch") if `scope` is omitted,
  // even when only a user token is needed.
  url.searchParams.set("scope", SLACK_BOT_SCOPES);
  if (kind === "user") url.searchParams.set("user_scope", SLACK_USER_SCOPES);
  return url.toString();
}

agent.get("/agent/slack/install/oauth/start", requireRole("admin"), h(async (req, res) => {
  res.json({ url: await slackAuthorizeUrl(req.user!.id, "install") });
}));

agent.get("/agent/slack/oauth/start", requireRole("admin"), h(async (req, res) => {
  res.json({ url: await slackAuthorizeUrl(req.user!.id, "user") });
}));

agent.get("/agent/slack/oauth/callback", h(async (req, res) => {
  const q = z.object({ code: z.string().min(1), state: z.string().min(1) }).parse(req.query);
  const { payload } = await jwtVerify(q.state, new TextEncoder().encode(process.env.API_JWT_SECRET ?? ""), {
    algorithms: ["HS256"],
  }).catch(() => {
    throw new HttpError(400, "Slack sign-in expired. Try Connect to Slack again.");
  });
  if (Number(payload.uid) !== req.user!.id) throw new HttpError(403, "Slack sign-in was started as a different user");
  const creds = await slackAppCreds();
  if (!creds) throw new HttpError(400, "Slack Client ID and Secret are not saved");
  const body = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    code: q.code,
    redirect_uri: slackRedirectUri(),
  });
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await tokenRes.json()) as {
    ok: boolean;
    error?: string;
    access_token?: string;
    bot_user_id?: string;
    team?: { id?: string };
    authed_user?: { id?: string; access_token?: string; scope?: string };
  };
  if (!json.ok) throw new HttpError(400, json.error ? `Slack: ${json.error}` : "Slack OAuth failed");

  if (payload.kind === "install") {
    if (req.user!.role !== "admin") throw new HttpError(403, "Not allowed");
    if (!json.access_token) throw new HttpError(400, "Slack did not return a bot token. Add bot scopes to the Slack app.");
    const saved = await saveBotInstall(json.access_token, json.team?.id, json.bot_user_id ?? null);
    const slackUserId = json.authed_user?.id;
    if (slackUserId && saved.slack_team_id) {
      await linkSlackUser(req.user!.id, slackUserId, saved.slack_team_id, json.authed_user?.access_token ?? null);
    }
    return res.json({ kind: "install", ...saved });
  }

  const userToken = json.authed_user?.access_token;
  if (!userToken) {
    throw new HttpError(400, "Slack did not return a user token. Add user token scopes to the Slack app.");
  }
  res.json({ kind: "user", ...(await saveSlackUserToken(req.user!.id, userToken, json.authed_user?.scope ?? SLACK_USER_SCOPES)) });
}));

agent.post("/agent/openai/key", requireRole("admin"), h(async (req, res) => {
  const { key } = z.object({ key: z.string().trim().min(20).max(500) }).parse(req.body);
  if (!/^sk-[A-Za-z0-9_-]+/.test(key)) throw new HttpError(400, "That does not look like an OpenAI API key (starts with sk-)");
  const check = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
  if (!check.ok) throw new HttpError(400, "OpenAI rejected that API key");
  let enc: string;
  try {
    enc = encryptSecret(key);
  } catch {
    throw new HttpError(500, "AGENT_TOKEN_SECRET or API_JWT_SECRET must be set (16+ characters)");
  }
  await pool.query(
    `insert into slack_app_config (id, openai_key_enc, updated_at) values (1,$1,now())
     on conflict (id) do update set openai_key_enc=excluded.openai_key_enc, updated_at=now()`,
    [enc],
  );
  res.json({ openai_configured: true });
}));

agent.delete("/agent/openai", requireRole("admin"), h(async (_req, res) => {
  await pool.query(`update slack_app_config set openai_key_enc=null, updated_at=now() where id=1`);
  res.json({ openai_configured: false });
}));

agent.delete("/agent/slack", h(async (req, res) => {
  await pool.query("delete from slack_connections where eval_user_id=$1", [req.user!.id]);
  res.json({ connected: false });
}));

agent.get("/agent/conversations", h(async (req, res) => {
  const { rows } = await pool.query(
    `select id, title, source, slack_channel_id, slack_thread_ts, updated_at from agent_conversations
     where user_id=$1 order by updated_at desc limit 50`,
    [req.user!.id],
  );
  res.json(rows);
}));

agent.post("/agent/conversations", h(async (req, res) => {
  const { rows } = await pool.query(
    `insert into agent_conversations (user_id, title, source) values ($1,'New chat','web')
     returning id, title, source, updated_at`,
    [req.user!.id],
  );
  res.status(201).json(rows[0]);
}));

agent.get("/agent/conversations/:id", h(async (req, res) => {
  const id = Number(req.params.id);
  const { rows: conv } = await pool.query(
    `select id, title, source, slack_channel_id, slack_thread_ts, updated_at from agent_conversations where id=$1 and user_id=$2`,
    [id, req.user!.id],
  );
  if (!conv[0]) throw new HttpError(404, "Conversation not found");
  const { rows: messages } = await pool.query(
    `select id, role, content, tool_name, created_at from agent_messages where conversation_id=$1 order by id`,
    [id],
  );
  res.json({ ...conv[0], messages });
}));

agent.post("/agent/chat", h(async (req, res) => {
  const b = z
    .object({
      conversation_id: z.number().int().optional(),
      message: z.string().trim().min(1).max(8000),
    })
    .parse(req.body);
  const user = req.user!;

  let convId = b.conversation_id;
  if (convId) {
    const owned = await pool.query("select 1 from agent_conversations where id=$1 and user_id=$2", [convId, user.id]);
    if (!owned.rowCount) throw new HttpError(404, "Conversation not found");
  } else {
    const title = b.message.slice(0, 60);
    const { rows } = await pool.query(
      `insert into agent_conversations (user_id, title, source) values ($1,$2,'web') returning id`,
      [user.id, title],
    );
    convId = rows[0].id as number;
  }

  await pool.query(`insert into agent_messages (conversation_id, role, content) values ($1,'user',$2)`, [convId, b.message]);
  const { rows: hist } = await pool.query<{ role: string; content: string }>(
    `select role, content from agent_messages where conversation_id=$1 and role in ('user','assistant') order by id desc limit 24`,
    [convId],
  );

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  send("conversation", { id: convId });

  try {
    const reply = await runAgentTurn(user, hist.reverse(), send);
    await pool.query(`insert into agent_messages (conversation_id, role, content) values ($1,'assistant',$2)`, [convId, reply]);
    await pool.query(`update agent_conversations set updated_at=now() where id=$1`, [convId]);
    const thread = await pool.query<{
      source: string;
      slack_channel_id: string | null;
      slack_thread_ts: string | null;
    }>("select source, slack_channel_id, slack_thread_ts from agent_conversations where id=$1", [convId]);
    const t = thread.rows[0];
    if (t?.source === "slack" && t.slack_channel_id) {
      try {
        const conn = await pool.query<{ slack_team_id: string }>(
          "select slack_team_id from slack_connections where eval_user_id=$1",
          [user.id],
        );
        await postSlackReply(conn.rows[0]?.slack_team_id, user.id, t.slack_channel_id, t.slack_thread_ts ?? undefined, reply);
      } catch (err) {
        console.error("Slack thread sync failed", err);
      }
    }
    send("done", { conversation_id: convId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Agent failed";
    send("error", { error: msg });
  }
  res.end();
}));
