"use client";

import { useMemo, useState } from "react";
import { useAction } from "@/lib/client";
import type { Interview, User } from "@/lib/types";
import Avatar from "./Avatar";
import Dropdown from "./Dropdown";
import InterviewCalendar from "./InterviewCalendar";
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
              <Dropdown<Interview["status"]>
                id={`s-${i.id}`}
                ariaLabel="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "scheduled", label: "scheduled" },
                  { value: "done", label: "done" },
                  { value: "cancelled", label: "cancelled" },
                ]}
              />
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
  const [view, setView] = useState<"calendar" | "list">("calendar");

  /* The legend lists whoever actually appears on the calendar. Members don't
     receive /users, so deriving from the interviews keeps the colour key and
     the filter working for them too. */
  const calendarPeople = useMemo(() => {
    const seen = new Map<number, User>();
    for (const i of interviews) {
      if (!seen.has(i.member_id)) {
        seen.set(i.member_id, {
          id: i.member_id,
          name: i.member_name,
          email: i.member_email,
          avatar: i.member_avatar ?? null,
        } as User);
      }
    }
    for (const p of people) if (!seen.has(p.id)) seen.set(p.id, p);
    return [...seen.values()].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  }, [interviews, people]);

  /* The <input type="datetime-local"> value is local wall-clock with no zone,
     so build it from the local parts rather than toISOString(), which would
     shift the time by the UTC offset. */
  const toLocalInput = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  return (
    <div className="stack">
      <div className="viewswitch" role="group" aria-label="View">
        <button
          type="button"
          className={view === "calendar" ? "on" : ""}
          onClick={() => setView("calendar")}
          aria-pressed={view === "calendar"}
        >
          Calendar
        </button>
        <button
          type="button"
          className={view === "list" ? "on" : ""}
          onClick={() => setView("list")}
          aria-pressed={view === "list"}
        >
          List
        </button>
      </div>

      {manage && (
        <div className="panel">
          <div className="row">
            <div>
              <label htmlFor="i-member">Person</label>
              <Dropdown<string>
                id="i-member"
                ariaLabel="Person"
                value={memberId}
                placeholder="Choose…"
                onChange={setMemberId}
                options={people.map((p) => ({
                  value: String(p.id),
                  label: p.name || p.email,
                  hint: p.name ? p.email : undefined,
                  media: <Avatar name={p.name} email={p.email} src={p.avatar} size={22} />,
                }))}
              />
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

      {view === "calendar" ? (
        <InterviewCalendar
          interviews={interviews}
          people={calendarPeople}
          onCreate={
            manage
              ? (d) => {
                  setAt(toLocalInput(d));
                  // The form sits above the calendar; bring it into view.
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              : undefined
          }
        />
      ) : (
        <div className="panel">
          {interviews.length === 0 ? (
            <div className="empty">{manage ? "No interviews scheduled yet." : "No interviews scheduled with you yet."}</div>
          ) : (
            interviews.map((i) => <Card key={`${i.id}-${i.status}-${i.notes ?? ""}`} i={i} canManage={manage} />)
          )}
        </div>
      )}
    </div>
  );
}
