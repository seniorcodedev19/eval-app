"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import type { AgentChatMessage, AgentConversation } from "@/lib/types";

const toolStatus: Record<string, string> = {
  eval_get_my_week: "Looking up your week",
  eval_list_metrics: "Listing metrics",
  eval_write_daily: "Updating Eval",
  slack_search: "Searching Slack",
  slack_fetch_messages: "Reading Slack",
  slack_post_message: "Posting to Slack",
};

async function loadList(): Promise<AgentConversation[]> {
  const res = await fetch("/api/proxy/agent/conversations", { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function loadOne(id: number): Promise<AgentConversation | null> {
  const res = await fetch(`/api/proxy/agent/conversations/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function readSse(
  res: Response,
  onEvent: (event: string, data: Record<string, unknown>) => void,
) {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const block of parts) {
      let event = "message";
      let data = "{}";
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        if (line.startsWith("data: ")) data = line.slice(6);
      }
      try {
        onEvent(event, JSON.parse(data) as Record<string, unknown>);
      } catch {
        /* ignore */
      }
    }
  }
}

export default function AgentChat() {
  const [list, setList] = useState<AgentConversation[]>([]);
  const [id, setId] = useState<number | null>(null);
  const [source, setSource] = useState("web");
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Thinking");
  const [error, setError] = useState<string | null>(null);
  const log = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(async () => setList(await loadList()), []);

  useEffect(() => {
    let live = true;
    void loadList().then((rows) => {
      if (live) setList(rows);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, busy]);

  async function openConv(cid: number) {
    const c = await loadOne(cid);
    if (!c) return;
    setId(c.id);
    setSource(c.source || "web");
    setMessages(c.messages ?? []);
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    setError(null);
    setBusy(true);
    setStatus("Thinking");
    setMessages((m) => [...m, { role: "user", content: text }]);
    try {
      const res = await fetch("/api/proxy/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: id ?? undefined, message: text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      await readSse(res, (event, data) => {
        if (event === "conversation" && typeof data.id === "number") setId(data.id);
        if (event === "tool" && typeof data.name === "string") {
          const name = String(data.name);
          setStatus(toolStatus[name] ?? `Using ${name}`);
          setMessages((m) => [...m, { role: "tool", content: name, tool_name: name }]);
        }
        if (event === "token" && typeof data.text === "string") {
          setMessages((m) => [...m, { role: "assistant", content: data.text as string }]);
        }
        if (event === "error") setError(String(data.error ?? "Agent failed"));
      });
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Agent failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="agent-shell">
      <aside className="agent-threads">
        <button
          type="button"
          className="btn secondary"
          style={{ width: "100%" }}
          onClick={() => {
            setId(null);
            setSource("web");
            setMessages([]);
            setError(null);
          }}
        >
          New chat
        </button>
        <ul>
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" className={`agent-thread${id === c.id ? " on" : ""}`} onClick={() => void openConv(c.id)}>
                <span className="agent-thread-title">{c.title}</span>
                {c.source === "slack" ? <span className="agent-thread-src">Slack</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="agent-main">
        <div className="agent-log" ref={log}>
          {source === "slack" && messages.length > 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>
              This thread is also in Slack. Replies you send here are posted back to that thread.
            </div>
          ) : null}
          {messages.length === 0 && !busy ? (
            <div className="agent-chat-empty">
              <strong>Ask about your week</strong>
              <div className="muted">Try “summarize this week” or ask about a metric.</div>
            </div>
          ) : null}
          {messages.map((m, i) => (
            <div key={i} className={`agent-bubble ${m.role}`}>
              {m.role === "tool" ? <span className="muted">Used {m.tool_name || m.content}</span> : m.content}
            </div>
          ))}
          {busy ? (
            <div className="agent-typing" aria-live="polite">
              <span className="agent-bot-face" aria-hidden="true">
                <Icon name="agent" size={18} />
              </span>
              <span className="agent-typing-text">{status}</span>
            </div>
          ) : null}
        </div>
        {error ? (
          <div className="msg error" role="alert">
            {error}
          </div>
        ) : null}
        <form
          className="agent-compose"
          data-busy="local"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            aria-label="Message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message your agent"
            disabled={busy}
          />
          <button className="btn" type="submit" disabled={busy || !draft.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
