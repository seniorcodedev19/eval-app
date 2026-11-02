import { createHmac, timingSafeEqual } from "node:crypto";
import { runAgentTurn } from "./agentLoop";
import { pool } from "./db";
import { botTokenFor, slackSigningSecret, slackTokenFor } from "./slackTokens";
import type { User } from "./types";

type SlackEvent = {
  type?: string;
  user?: string;
  text?: string;
  channel?: string;
  ts?: string;
  thread_ts?: string;
  bot_id?: string;
  subtype?: string;
  channel_type?: string;
  team?: string;
  assistant_thread?: { user_id?: string; channel_id?: string; thread_ts?: string };
};

type SlackEnvelope = {
  type?: string;
  team_id?: string;
  event_id?: string;
  event?: SlackEvent;
  challenge?: string;
};

const seen = new Map<string, number>();

function alreadySeen(id: string): boolean {
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > 10 * 60 * 1000) seen.delete(k);
  if (seen.has(id)) return true;
  seen.set(id, now);
  return false;
}

export async function verifySlackSignature(
  timestamp: string | undefined,
  signature: string | undefined,
  rawBody: string,
): Promise<boolean> {
  const secret = await slackSigningSecret();
  if (!secret || !timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) return false;
  const digest = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function slackPost(token: string, channel: string, text: string, threadTs?: string) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel, text: text.slice(0, 3900), thread_ts: threadTs, unfurl_links: false }),
  });
  return (await res.json()) as { ok: boolean; error?: string };
}

function cleanText(text: string) {
  return text.replace(/<@[A-Z0-9]+>/gi, "").replace(/\s+/g, " ").trim();
}

function isDbDisconnect(err: unknown) {
  const e = err as { code?: string; message?: string };
  return (
    e.code === "57P01" ||
    e.code === "08P01" ||
    e.code === "ECONNRESET" ||
    /terminat|timeout|ECONNRESET/i.test(e.message ?? "")
  );
}

async function q<T>(text: string, params?: unknown[]) {
  try {
    return await pool.query<T>(text, params);
  } catch (err) {
    if (!isDbDisconnect(err)) throw err;
    return pool.query<T>(text, params);
  }
}

async function evalUserFromSlack(slackUserId: string, teamId?: string | null): Promise<User | undefined> {
  const { rows } = await q<User>(
    `select u.id, u.email, u.name, u.role, u.team_id, u.active
     from slack_connections c
     join users u on u.id = c.eval_user_id
     where c.slack_user_id=$1 and ($2::text is null or c.slack_team_id=$2)`,
    [slackUserId, teamId ?? null],
  );
  if (rows[0]) return rows[0];
  const bot = await botTokenFor(teamId);
  if (!bot) return undefined;
  const res = await fetch(`https://slack.com/api/users.info?user=${encodeURIComponent(slackUserId)}`, {
    headers: { Authorization: `Bearer ${bot}` },
  });
  const json = (await res.json()) as { ok?: boolean; user?: { profile?: { email?: string } } };
  const email = json.user?.profile?.email?.trim().toLowerCase();
  if (!email) return undefined;
  const byEmail = await q<User>(
    `select id, email, name, role, team_id, active from users where lower(email)=$1 and active=true`,
    [email],
  );
  return byEmail.rows[0];
}

export async function postSlackReply(
  teamId: string | undefined,
  evalUserId: number | null,
  channel: string,
  threadTs: string | undefined,
  text: string,
) {
  const bot = await botTokenFor(teamId);
  const userTok = evalUserId ? await slackTokenFor(evalUserId) : null;
  const token = bot || userTok;
  if (!token) {
    console.error("Slack inbound: no bot or user token to reply");
    return;
  }
  const r = await slackPost(token, channel, text, threadTs);
  if (!r.ok) console.error("Slack inbound post failed:", r.error);
}

export async function handleSlackEnvelope(body: SlackEnvelope): Promise<void> {
  if (body.type !== "event_callback" || !body.event) return;
  const ev = body.event;
  const id = body.event_id || `${ev.channel}:${ev.ts}`;
  if (alreadySeen(id)) return;
  if (ev.bot_id || ev.subtype) return;

  const teamId = body.team_id || ev.team;
  if (ev.type === "assistant_thread_started") {
    const th = ev.assistant_thread;
    if (!th?.channel_id || !th.thread_ts) return;
    await postSlackReply(teamId, null, th.channel_id, th.thread_ts, "Hi — send a message here and I’ll help with Eval.");
    return;
  }

  const isMention = ev.type === "app_mention";
  const isDm = ev.type === "message" && (ev.channel_type === "im" || (ev.channel ?? "").startsWith("D"));
  if (!isMention && !isDm) return;
  if (!ev.user || !ev.channel || !ev.ts) return;

  const text = cleanText(ev.text ?? "");
  if (!text) return;

  const threadTs = ev.thread_ts || ev.ts;

  const user = await evalUserFromSlack(ev.user, teamId);
  if (!user || !user.active) {
    await postSlackReply(
      teamId,
      null,
      ev.channel,
      threadTs,
      "I can’t match you to an Eval account. Use the same email in Slack and Eval. An admin connects Slack under Admin → Agent connect.",
    );
    return;
  }

  let convId: number;
  const existing = await q<{ id: number }>(
    `select id from agent_conversations
     where user_id=$1 and source='slack' and slack_channel_id=$2 and slack_thread_ts=$3
     order by id desc limit 1`,
    [user.id, ev.channel, threadTs],
  );
  if (existing.rows[0]) {
    convId = existing.rows[0].id;
  } else {
    const title = text.slice(0, 60);
    const ins = await q<{ id: number }>(
      `insert into agent_conversations (user_id, title, source, slack_channel_id, slack_thread_ts)
       values ($1,$2,'slack',$3,$4) returning id`,
      [user.id, title, ev.channel, threadTs],
    );
    convId = ins.rows[0].id;
  }

  await q(`insert into agent_messages (conversation_id, role, content) values ($1,'user',$2)`, [convId, text]);
  const { rows: hist } = await q<{ role: string; content: string }>(
    `select role, content from agent_messages where conversation_id=$1 and role in ('user','assistant') order by id desc limit 24`,
    [convId],
  );

  let replyText: string;
  try {
    replyText = await runAgentTurn(user, hist.reverse(), () => undefined);
  } catch (err) {
    replyText = err instanceof Error ? err.message : "Agent failed";
  }

  await q(`insert into agent_messages (conversation_id, role, content) values ($1,'assistant',$2)`, [convId, replyText]);
  await q(`update agent_conversations set updated_at=now() where id=$1`, [convId]);
  await postSlackReply(teamId, user.id, ev.channel, threadTs, replyText);
}
