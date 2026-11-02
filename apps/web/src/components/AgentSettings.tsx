"use client";

import { useCallback, useEffect, useState } from "react";
import { useAction } from "@/lib/client";
import type { SlackStatus } from "@/lib/types";

export default function AgentSettings({ status }: { status: SlackStatus }) {
  const { error, busy, run, setError } = useAction();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setApiKey("");
    setToken("");
    setError(null);
  }, [setError]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button type="button" className="btn secondary" onClick={() => setOpen(true)}>
        Agent settings
      </button>
      {open ? (
        <div className="modal-back" onClick={close} role="presentation">
          <div
            className="modal panel"
            role="dialog"
            aria-labelledby="agent-settings-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="head" style={{ marginBottom: 12 }}>
              <h2 id="agent-settings-title" style={{ margin: 0 }}>
                Agent settings
              </h2>
              <button type="button" className="btn secondary" onClick={close}>
                Close
              </button>
            </div>

            <section className="agent-settings-section">
              <h3>OpenAI</h3>
              <p className="sub">
                {status.openai_configured
                  ? "An API key is saved for your agent. Paste a new one to replace it."
                  : "Paste your OpenAI API key. It is stored encrypted and is never shown again."}
              </p>
              <label htmlFor="agent-api-key">API key</label>
              <input
                id="agent-api-key"
                type="password"
                autoComplete="off"
                placeholder="sk-…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <div className="row">
                <button
                  className="btn"
                  type="button"
                  disabled={busy || apiKey.trim().length < 20}
                  onClick={async () => {
                    if (await run("POST", "/agent/openai/key", { key: apiKey.trim() })) setApiKey("");
                  }}
                >
                  Save API key
                </button>
                {status.openai_configured ? (
                  <button
                    className="btn danger"
                    type="button"
                    disabled={busy}
                    onClick={() => void run("DELETE", "/agent/openai")}
                  >
                    Remove key
                  </button>
                ) : null}
              </div>
            </section>

            <section className="agent-settings-section">
              <h3>Slack</h3>
              {status.connected ? (
                <div className="banner note" style={{ marginBottom: 12 }}>
                  Connected{status.slack_user_id ? ` as Slack user ${status.slack_user_id}` : ""}.
                </div>
              ) : (
                <p className="sub">
                  Connect your Slack account so the agent can search your channels and post as you. An admin adds Eval
                  to the workspace under Admin → Agent connect.
                </p>
              )}
              <div className="row" style={{ marginBottom: 12 }}>
                <button
                  className="btn"
                  type="button"
                  disabled={busy || connecting}
                  onClick={async () => {
                    setError(null);
                    setConnecting(true);
                    try {
                      const res = await fetch("/api/proxy/agent/slack/oauth/start", { cache: "no-store" });
                      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
                      if (!res.ok || !j.url) {
                        setError(j.error ?? "Could not start Slack connect");
                        return;
                      }
                      window.location.assign(j.url);
                    } catch {
                      setError("Could not start Slack connect");
                    } finally {
                      setConnecting(false);
                    }
                  }}
                >
                  {status.connected ? "Reconnect Slack" : "Connect Slack"}
                </button>
                {status.connected ? (
                  <button
                    className="btn danger"
                    type="button"
                    disabled={busy}
                    onClick={() => void run("DELETE", "/agent/slack")}
                  >
                    Disconnect
                  </button>
                ) : null}
              </div>
              <label htmlFor="slack-token">Or paste a user token</label>
              <input
                id="slack-token"
                type="password"
                autoComplete="off"
                placeholder="xoxp-…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <div className="row">
                <button
                  className="btn secondary"
                  type="button"
                  disabled={busy || token.trim().length < 10}
                  onClick={async () => {
                    if (await run("POST", "/agent/slack/token", { token: token.trim() })) setToken("");
                  }}
                >
                  Save token
                </button>
              </div>
            </section>

            {error ? (
              <div className="msg error" role="alert">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
