"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";
import type { Interview, User } from "@/lib/types";
import PersonCell from "./PersonCell";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function Card({ i, canManage }: { i: Interview; canManage: boolean }) {
  const { error, busy, run } = useAction();
  const [status, setStatus] = useState(i.status);
  const [notes, setNotes] = useState(i.notes ?? "");
  const dirty = status !== i.status || notes !== (i.notes ?? "");

  return (
    <div className="item">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <strong>{i.topic}</strong>
          <div className="row" style={{ marginTop: 8, gap: 16 }}>
            <PersonCell name={i.member_name} email={i.member_email} avatar={i.member_avatar} size={28} sub="Member" />
            <PersonCell
              name={i.interviewer_name}
              email={i.interviewer_email}
              avatar={i.interviewer_avatar}
              size={28}
              sub="Interviewer"
            />
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            <span suppressHydrationWarning>{when(i.scheduled_at)}</span>
          </div>
        </div>
        <span className="pill">{i.status}</span>
      </div>
      {canManage ? (
        <div className="stack" style={{ marginTop: 10 }}>
          <div className="row">
            <div>
              <label htmlFor={`s-${i.id}`}>Status</label>
              <select id={`s-${i.id}`} value={status} onChange={(e) => setStatus(e.target.value as Interview["status"])}>
                <option value="scheduled">scheduled</option>
                <option value="done">done</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor={`n-${i.id}`}>Notes (visible to {i.member_name})</label>
            <textarea id={`n-${i.id}`} value={notes} maxLength={4000} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="row">
            <button className="btn secondary" disabled={!dirty || busy} onClick={() => run("PATCH", `/interviews/${i.id}`, { status, notes })}>
              Save
            </button>
          </div>
          {error && <div className="msg error" role="alert">{error}</div>}
        </div>
      ) : (
        i.notes && <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap" }}>{i.notes}</p>
      )}
    </div>
  );
}

export default function InterviewsPanel({ me, interviews, members }: { me: User; interviews: Interview[]; members: User[] }) {
  const { error, busy, run } = useAction();
  const manage = me.role !== "member";
  const people = members.filter((m) => m.id !== me.id && m.active);
  const [memberId, setMemberId] = useState("");
  const [at, setAt] = useState("");
  const [topic, setTopic] = useState("1:1 review");

  return (
    <div className="stack">
      {manage && (
        <div className="panel">
          <div className="row">
            <div>
              <label htmlFor="i-member">Person</label>
              <select id="i-member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">Choose…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="i-at">Date and time</label>
              <input id="i-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
            </div>
            <div>
              <label htmlFor="i-topic">Topic</label>
              <input id="i-topic" value={topic} maxLength={120} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <button
              className="btn"
              disabled={!memberId || !at || !topic.trim() || busy}
              onClick={async () => {
                const ok = await run("POST", "/interviews", {
                  member_id: Number(memberId),
                  scheduled_at: new Date(at).toISOString(),
                  topic,
                });
                if (ok) {
                  setAt("");
                  setMemberId("");
                }
              }}
            >
              Schedule
            </button>
          </div>
          {error && <div className="msg error" role="alert">{error}</div>}
        </div>
      )}

      <div className="panel">
        {interviews.length === 0 ? (
          <div className="empty">{manage ? "No interviews scheduled yet." : "No interviews scheduled with you yet."}</div>
        ) : (
          interviews.map((i) => <Card key={`${i.id}-${i.status}-${i.notes ?? ""}`} i={i} canManage={manage} />)
        )}
      </div>
    </div>
  );
}
