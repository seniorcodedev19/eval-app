"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Interview, User } from "@/lib/types";

/* A week calendar for interviews, in the viewer's own time zone.

   Deliberately local, not UTC: the weekly scoring code is UTC because a week
   boundary must mean the same thing for everyone, but a meeting at 2pm is at
   2pm where you are. So this file uses local Date methods throughout and
   never touches lib/dates.ts, which is UTC by design.

   Month and day views build on the same pieces; week is the one in use now.

   Scale note: the page asks the API for just the range it is showing
   (`/interviews?from=…&to=…`), so a year of history costs nothing to render. */

const HOUR_PX = 48;

/** Midnight local on the Sunday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(undefined, o);

/** "Nov 1 – Nov 7, 2026", collapsing the month when both ends share one. */
function rangeLabel(from: Date, to: Date): string {
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const left = fmt(from, { month: "short", day: "numeric" });
  const right = sameMonth
    ? `${to.getDate()}, ${to.getFullYear()}`
    : `${fmt(to, { month: "short", day: "numeric" })}, ${to.getFullYear()}`;
  return `${left} – ${right}`;
}

const hourLabel = (h: number) =>
  h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;

export default function InterviewCalendar({
  interviews,
  people,
  onOpen,
  onCreate,
}: {
  interviews: Interview[];
  /** Everyone who can appear in the legend, for the colour key and filter. */
  people: User[];
  onOpen?: (i: Interview) => void;
  /** Called with the clicked slot, local time, so a parent can prefill a form. */
  onCreate?: (at: Date) => void;
}) {
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const gridRef = useRef<HTMLDivElement>(null);

  // The "now" line only needs to be roughly right; once a minute is plenty.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const days = useMemo(() => [...Array(7)].map((_, i) => addDays(anchor, i)), [anchor]);

  /* One colour per person, assigned by their position in the list so a given
     person keeps the same colour as the week changes. */
  const colourOf = useMemo(() => {
    const m = new Map<number, number>();
    people.forEach((p, i) => m.set(p.id, i % 6));
    return m;
  }, [people]);

  const shown = useMemo(
    () => interviews.filter((i) => !hidden.has(i.member_id)),
    [interviews, hidden],
  );

  /* Lay events out per day. Overlapping events split the column width between
     them, the way a calendar does, rather than stacking out of sight. */
  const byDay = useMemo(() => {
    const map = new Map<number, { ev: Interview; at: Date; col: number; of: number }[]>();
    for (const d of days) map.set(d.getTime(), []);
    for (const ev of shown) {
      const at = new Date(ev.scheduled_at);
      const key = days.find((d) => sameDay(d, at))?.getTime();
      if (key === undefined) continue;
      map.get(key)!.push({ ev, at, col: 0, of: 1 });
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.at.getTime() - b.at.getTime());
      // A simple sweep: events starting within an hour of each other share a row.
      let group: typeof list = [];
      const flush = () => {
        group.forEach((g, i) => {
          g.col = i;
          g.of = group.length;
        });
        group = [];
      };
      for (const item of list) {
        if (group.length && item.at.getTime() - group[0].at.getTime() >= 3_600_000) flush();
        group.push(item);
      }
      flush();
    }
    return map;
  }, [shown, days]);

  // Open on the working day rather than midnight.
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 8 * HOUR_PX;
  }, []);

  const today = new Date();
  const weekEnd = addDays(anchor, 6);
  const nowInWeek = now >= anchor && now.getTime() < addDays(anchor, 7).getTime();

  return (
    <div className="cal">
      <aside className="cal-side">
        <div className="panel cal-legend">
          <h2 className="panel-title">People</h2>
          {people.length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>
              Nobody to show yet.
            </p>
          ) : (
            people.map((p) => (
              <label className="cal-person" key={p.id}>
                <input
                  type="checkbox"
                  checked={!hidden.has(p.id)}
                  onChange={() =>
                    setHidden((s) => {
                      const next = new Set(s);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      return next;
                    })
                  }
                />
                <span className={`cal-dot s${colourOf.get(p.id) ?? 0}`} aria-hidden="true" />
                <span className="cal-person-text">
                  <strong>{p.name || p.email}</strong>
                  <span className="muted small">{p.email}</span>
                </span>
              </label>
            ))
          )}
        </div>
        <p className="muted small cal-tz">
          Times are {Intl.DateTimeFormat().resolvedOptions().timeZone}.
        </p>
      </aside>

      <div className="cal-main">
        <div className="cal-toolbar">
          <button className="btn secondary" type="button" onClick={() => setAnchor(startOfWeek(new Date()))}>
            Today
          </button>
          <button
            className="icon-btn"
            type="button"
            aria-label="Previous week"
            onClick={() => setAnchor((a) => addDays(a, -7))}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            className="icon-btn"
            type="button"
            aria-label="Next week"
            onClick={() => setAnchor((a) => addDays(a, 7))}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h2 className="cal-range">{rangeLabel(anchor, weekEnd)}</h2>
        </div>

        <div className="cal-head">
          <span className="cal-gutter" aria-hidden="true" />
          {days.map((d) => (
            <span className={`cal-dayhead${sameDay(d, today) ? " today" : ""}`} key={d.getTime()}>
              <span className="cal-dayname">{fmt(d, { weekday: "short" })}</span>
              <span className="cal-daynum">{d.getDate()}</span>
            </span>
          ))}
        </div>

        <div className="cal-grid" ref={gridRef}>
          <div className="cal-gutter">
            {[...Array(24)].map((_, h) => (
              <span className="cal-hour" key={h} style={{ height: HOUR_PX }}>
                {h > 0 && <span>{hourLabel(h)}</span>}
              </span>
            ))}
          </div>

          {days.map((d) => (
            <div className="cal-col" key={d.getTime()}>
              {[...Array(24)].map((_, h) => (
                <button
                  type="button"
                  className="cal-slot"
                  key={h}
                  style={{ height: HOUR_PX }}
                  aria-label={`New interview on ${fmt(d, { month: "short", day: "numeric" })} at ${hourLabel(h)}`}
                  onClick={() => {
                    const at = new Date(d);
                    at.setHours(h, 0, 0, 0);
                    onCreate?.(at);
                  }}
                />
              ))}

              {nowInWeek && sameDay(d, now) && (
                <span
                  className="cal-now"
                  style={{ top: (now.getHours() + now.getMinutes() / 60) * HOUR_PX }}
                  aria-hidden="true"
                />
              )}

              {(byDay.get(d.getTime()) ?? []).map(({ ev, at, col, of }) => (
                <button
                  type="button"
                  key={ev.id}
                  className={`cal-event s${colourOf.get(ev.member_id) ?? 0} status-${ev.status}`}
                  style={{
                    top: (at.getHours() + at.getMinutes() / 60) * HOUR_PX,
                    height: HOUR_PX - 4,
                    left: `${(col / of) * 100}%`,
                    width: `${100 / of}%`,
                  }}
                  title={`${at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · ${ev.member_name}${ev.topic ? ` · ${ev.topic}` : ""}`}
                  onClick={() => onOpen?.(ev)}
                >
                  {/* Time and name share the first line: an hour block is
                      only so tall, and a third line gets clipped. The topic
                      follows if it fits. The title carries the full text. */}
                  <span className="cal-event-top">
                    <span className="cal-event-time">
                      {at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span className="cal-event-title">{ev.member_name}</span>
                  </span>
                  {ev.topic && <span className="cal-event-sub">{ev.topic}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
