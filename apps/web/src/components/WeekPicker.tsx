"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, recentWeeks, weekLabel, weekStartOf } from "@/lib/dates";

function href(base: string, extra: Record<string, string>, week: string | undefined, param: string) {
  const p = new URLSearchParams(extra);
  if (week) p.set(param, week);
  else p.delete(param);
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}

export function WeekSelect({
  id = "week",
  label = "Week",
  value,
  today,
  onChange,
}: {
  id?: string;
  label?: string;
  value: string;
  today: string;
  onChange: (weekStart: string) => void;
}) {
  const thisWeek = weekStartOf(today);
  let weeks = recentWeeks(today);
  if (value && !weeks.some((w) => w.start === value)) {
    weeks = [{ start: value, end: addDays(value, 6) }, ...weeks].sort((a, b) => b.start.localeCompare(a.start));
  }
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={{ minWidth: 220 }}>
        {weeks.map((w) => (
          <option key={w.start} value={w.start}>
            {weekLabel(w.start, w.end)}
            {w.start === thisWeek ? " (this week)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function WeekPicker({
  base,
  weekStart,
  weekEnd,
  today,
  extra = {},
  param = "week",
  selectId,
}: {
  base: string;
  weekStart: string;
  weekEnd: string;
  today: string;
  extra?: Record<string, string>;
  param?: string;
  selectId?: string;
}) {
  const router = useRouter();
  const thisWeek = weekStartOf(today);
  const go = (start?: string) => href(base, extra, start, param);
  return (
    <div className="row" style={{ alignItems: "end" }}>
      <WeekSelect
        id={selectId ?? param}
        value={weekStart}
        today={today}
        onChange={(start) => router.push(go(start === thisWeek ? undefined : start))}
      />
      <Link className="btn secondary" href={go(addDays(weekStart, -7))} aria-label="Previous week">
        ←
      </Link>
      <div style={{ minWidth: 120, textAlign: "center", paddingBottom: 6 }}>
        <strong>{weekLabel(weekStart, weekEnd)}</strong>
        {weekStart === thisWeek && <div className="muted" style={{ fontSize: 13 }}>This week</div>}
      </div>
      <Link
        className="btn secondary"
        href={go(addDays(weekStart, 7))}
        aria-label="Next week"
        aria-disabled={weekStart >= thisWeek}
        style={weekStart >= thisWeek ? { pointerEvents: "none", opacity: 0.4 } : undefined}
      >
        →
      </Link>
      {weekStart !== thisWeek && (
        <Link className="btn secondary" href={go(undefined)}>
          This week
        </Link>
      )}
    </div>
  );
}
