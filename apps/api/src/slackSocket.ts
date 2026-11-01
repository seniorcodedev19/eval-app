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

export async function startSlackSocket() {
  stopCurrent?.();
  stopCurrent = null;

  const appToken = await slackAppToken();
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
