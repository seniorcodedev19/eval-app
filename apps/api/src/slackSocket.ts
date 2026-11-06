import { slackAppToken } from "./slackTokens";
import { handleSlackEnvelope } from "./slackInbound";

type SocketMsg = {
  type?: string;
  envelope_id?: string;
  payload?: { type?: string; team_id?: string; event_id?: string; event?: Record<string, unknown> };
};

let stopCurrent: (() => void) | null = null;

async function openUrl(appToken: string): Promise<string> {
  const res = await fetch("https://slack.com/api/apps.connections.open", {
    method: "POST",
    headers: { Authorization: `Bearer ${appToken}`, "Content-Type": "application/x-www-form-urlencoded" },
  });
  const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
  if (!json.ok || !json.url) throw new Error(json.error ?? "apps.connections.open failed");
  return json.url;
}

// The token lives in Postgres, so a cold/unreachable database looks like a Slack
// failure here. Back off instead of retrying every 8s forever, and say which it is.
const TOKEN_RETRY_MAX = 5;

// Socket Mode is off in this version. Set SLACK_SOCKET_MODE=true to turn it back on;
// everything below still works and is kept for when it is re-enabled.
const socketModeEnabled = () => /^(1|true|yes|on)$/i.test((process.env.SLACK_SOCKET_MODE ?? "").trim());

export async function startSlackSocket(tokenAttempt = 0) {
  stopCurrent?.();
  stopCurrent = null;

  if (!socketModeEnabled()) {
    if (tokenAttempt === 0) {
      console.log("Slack Socket Mode disabled (set SLACK_SOCKET_MODE=true to enable)");
    }
    return;
  }

  let appToken = "";
  try {
    appToken = await slackAppToken();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const dbDown = /timeout|ECONNREFUSED|ENOTFOUND|terminated|Connection/i.test(message);
    const what = dbDown ? "database is unreachable" : "token lookup failed";
    if (tokenAttempt >= TOKEN_RETRY_MAX) {
      console.error(
        `Slack Socket Mode off: ${what} after ${TOKEN_RETRY_MAX} attempts (${message}). ` +
          "The API still works; restart it once the database is reachable.",
      );
      return;
    }
    const wait = Math.min(8000 * 2 ** tokenAttempt, 60_000);
    console.error(
      `Slack Socket Mode: ${what} (${message}). Retry ${tokenAttempt + 1}/${TOKEN_RETRY_MAX} in ${wait / 1000}s.`,
    );
    setTimeout(() => void startSlackSocket(tokenAttempt + 1), wait);
    return;
  }
  if (!appToken) {
    console.log("Slack Socket Mode off (save an app-level token on Agent connect for local DMs / @eval)");
    return;
  }

  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ws: WebSocket | undefined;

  stopCurrent = () => {
    closed = true;
    if (timer) clearTimeout(timer);
    ws?.close();
  };

  const connect = async () => {
    if (closed) return;
    try {
      const url = await openUrl(appToken);
      if (closed) return;
      ws = new WebSocket(url);
      ws.addEventListener("open", () => console.log("Slack Socket Mode connected"));
      ws.addEventListener("message", (ev) => {
        let msg: SocketMsg;
        try {
          msg = JSON.parse(String(ev.data)) as SocketMsg;
        } catch {
          return;
        }
        if (msg.envelope_id) {
          ws?.send(JSON.stringify({ envelope_id: msg.envelope_id }));
        }
        if (msg.type === "events_api" && msg.payload) {
          const ev = msg.payload.event;
          console.log("Slack event", msg.payload.type, ev?.type, ev?.channel_type);
          void handleSlackEnvelope(msg.payload).catch((err) => console.error("Slack socket event failed", err));
        }
      });
      ws.addEventListener("close", () => {
        if (closed) return;
        console.log("Slack Socket Mode disconnected; retrying");
        timer = setTimeout(() => void connect(), 3000);
      });
      ws.addEventListener("error", () => ws?.close());
    } catch (err) {
      console.error("Slack Socket Mode failed", err instanceof Error ? err.message : err);
      if (!closed) timer = setTimeout(() => void connect(), 8000);
    }
  };

  void connect();
}
