"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";
import type { SlackInstallStatus } from "@/lib/types";

export default function AdminAgentConnect({ status }: { status: SlackInstallStatus }) {
  const { error, busy, run, setError } = useAction();
  const [clientId, setClientId] = useState(status.client_id ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [appToken, setAppToken] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function addToSlack() {
    setError(null);
    setConnecting(true);
    try {
      const res = await fetch("/api/proxy/agent/slack/install/oauth/start", { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !j.url) {
        setError(j.error ?? "Could not start Slack install");
        return;
      }
      window.location.assign(j.url);
    } catch {
      setError("Could not start Slack install");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 560 }}>
      {status.installed ? (
        <div className="banner note">
          Eval is added to Slack
          {status.workspaces[0]?.slack_team_id ? ` (workspace ${status.workspaces[0].slack_team_id})` : ""}.
        </div>
      ) : (
        <p className="sub">
          Save the Slack app Client ID and Secret, then Connect to Slack to add Eval to the workspace. Users still paste
          their own token in Agent settings.
        </p>
      )}

      <p className="sub">
        Create the app at{" "}
        <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer">
          api.slack.com/apps
        </a>
        . Redirect URL: <code>http://localhost:3000/api/slack/callback</code>
        . For DMs: App Home → Messages Tab on, Socket Mode on, bot events <code>app_mention</code> and{" "}
        <code>message.im</code>.
      </p>

      <label htmlFor="slack-client-id">Client ID</label>
      <input
        id="slack-client-id"
        autoComplete="off"
        placeholder="Slack Client ID"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        style={{ width: "100%", marginBottom: 12 }}
      />
      <label htmlFor="slack-client-secret">Client secret</label>
      <input
        id="slack-client-secret"
        type="password"
        autoComplete="off"
        placeholder={status.has_secret ? "Saved — paste to replace" : "Slack Client Secret"}
        value={clientSecret}
        onChange={(e) => setClientSecret(e.target.value)}
        style={{ width: "100%", marginBottom: 12 }}
      />
      <label htmlFor="slack-signing-secret">Signing secret</label>
      <input
        id="slack-signing-secret"
        type="password"
        autoComplete="off"
        placeholder={status.has_signing_secret ? "Saved — paste to replace" : "From Basic Information"}
        value={signingSecret}
        onChange={(e) => setSigningSecret(e.target.value)}
        style={{ width: "100%", marginBottom: 12 }}
      />
      <label htmlFor="slack-app-token">App-level token (Socket Mode)</label>
      <input
        id="slack-app-token"
        type="password"
        autoComplete="off"
        placeholder={status.has_app_token ? "Saved — paste to replace" : "xapp-… (scope connections:write)"}
        value={appToken}
        onChange={(e) => setAppToken(e.target.value)}
        style={{ width: "100%", marginBottom: 12 }}
      />
      <button
        className="btn secondary"
        type="button"
        disabled={busy || !clientId.trim() || (!clientSecret.trim() && !status.has_secret)}
        onClick={async () => {
          if (
            await run("POST", "/agent/slack/install/credentials", {
              client_id: clientId.trim(),
              client_secret: clientSecret.trim() || undefined,
              signing_secret: signingSecret.trim() || undefined,
              app_token: appToken.trim() || undefined,
            })
          ) {
            setClientSecret("");
            setSigningSecret("");
            setAppToken("");
          }
        }}
        style={{ marginBottom: 20 }}
      >
        Save credentials
      </button>

      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn" type="button" disabled={busy || connecting} onClick={() => void addToSlack()}>
          Connect to Slack
        </button>
        {status.installed ? (
          <button className="btn danger" type="button" disabled={busy} onClick={() => void run("DELETE", "/agent/slack/install")}>
            Remove from Slack
          </button>
        ) : null}
      </div>

      <label htmlFor="slack-bot-token">Bot token (optional)</label>
      <input
        id="slack-bot-token"
        type="password"
        autoComplete="off"
        placeholder="xoxb-…"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={{ width: "100%", marginBottom: 12 }}
      />
      <button
        className="btn secondary"
        type="button"
        disabled={busy || token.trim().length < 10}
        onClick={async () => {
          if (await run("POST", "/agent/slack/install/token", { token: token.trim() })) setToken("");
        }}
      >
        Save bot token
      </button>

      {error ? (
        <div className="msg error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
