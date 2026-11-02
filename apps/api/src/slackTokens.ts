import { decryptSecret } from "./crypto";
import { pool } from "./db";

export async function openaiKeyFor(_evalUserId?: number): Promise<string | null> {
  const row = await slackAppConfigRow();
  const fromOrg = fromEnc(row?.openai_key_enc, process.env.OPENAI_API_KEY);
  return fromOrg || null;
}

type AppConfigRow = {
  client_id: string;
  client_secret_enc: string | null;
  signing_secret_enc: string | null;
  app_token_enc: string | null;
  openai_key_enc: string | null;
};

async function slackAppConfigRow(): Promise<AppConfigRow | null> {
  try {
    const { rows } = await pool.query<AppConfigRow>(
      "select client_id, client_secret_enc, signing_secret_enc, app_token_enc, openai_key_enc from slack_app_config where id=1",
    );
    return rows[0] ?? null;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "42P01" || code === "42703") return null;
    throw err;
  }
}

function fromEnc(packed: string | null | undefined, env: string | undefined): string {
  if (packed) {
    try {
      return decryptSecret(packed);
    } catch {
      /* keep env fallback */
    }
  }
  return (env || "").trim();
}

export async function slackAppCreds(): Promise<{ client_id: string; client_secret: string } | null> {
  const row = await slackAppConfigRow();
  const client_id = (row?.client_id || process.env.SLACK_CLIENT_ID || "").trim();
  const client_secret = fromEnc(row?.client_secret_enc, process.env.SLACK_CLIENT_SECRET);
  if (!client_id || !client_secret) return null;
  return { client_id, client_secret };
}

export async function slackSigningSecret(): Promise<string> {
  const row = await slackAppConfigRow();
  return fromEnc(row?.signing_secret_enc, process.env.SLACK_SIGNING_SECRET);
}

export async function slackAppToken(): Promise<string> {
  const row = await slackAppConfigRow();
  return fromEnc(row?.app_token_enc, process.env.SLACK_APP_TOKEN);
}

export async function botTokenFor(slackTeamId?: string | null): Promise<string | null> {
  if (process.env.SLACK_BOT_TOKEN) return process.env.SLACK_BOT_TOKEN;
  if (slackTeamId) {
    const { rows } = await pool.query<{ bot_token_enc: string | null }>(
      "select bot_token_enc from slack_app_install where slack_team_id=$1",
      [slackTeamId],
    );
    if (rows[0]?.bot_token_enc) {
      try {
        return decryptSecret(rows[0].bot_token_enc);
      } catch {
        /* try latest install */
      }
    }
  }
  const { rows } = await pool.query<{ bot_token_enc: string | null }>(
    "select bot_token_enc from slack_app_install order by installed_at desc limit 1",
  );
  if (!rows[0]?.bot_token_enc) return null;
  try {
    return decryptSecret(rows[0].bot_token_enc);
  } catch {
    return null;
  }
}

export async function slackTokenFor(evalUserId: number): Promise<string | null> {
  const { rows } = await pool.query<{ user_token_enc: string }>(
    "select user_token_enc from slack_connections where eval_user_id=$1",
    [evalUserId],
  );
  if (!rows[0]) return null;
  try {
    return decryptSecret(rows[0].user_token_enc);
  } catch {
    return null;
  }
}
