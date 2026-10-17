import Link from "next/link";
import { addDays, weekLabel, weekStartOf } from "@/lib/dates";

// Previous / next week links. `thisWeek` is the Sunday of the current week.
function href(base: string, extra: Record<string, string>, week?: string) {
  const p = new URLSearchParams(extra);
  if (week) p.set("week", week);
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}

export default function WeekPicker({
  base,
  weekStart,
  weekEnd,
  today,
  extra = {},
}: {
  base: string;
  weekStart: string;
  weekEnd: string;
  today: string;
  extra?: Record<string, string>;
}) {
  const thisWeek = weekStartOf(today);
  return (
    <div className="row" style={{ alignItems: "center" }}>
      <Link className="btn secondary" href={href(base, extra, addDays(weekStart, -7))} aria-label="Previous week">
        ←
      </Link>
      <div style={{ minWidth: 150, textAlign: "center" }}>
        <strong>{weekLabel(weekStart, weekEnd)}</strong>
        {weekStart === thisWeek && <div className="muted" style={{ fontSize: 13 }}>This week</div>}
      </div>
      <Link
        className="btn secondary"
        href={href(base, extra, addDays(weekStart, 7))}
        aria-label="Next week"
        aria-disabled={weekStart >= thisWeek}
        style={weekStart >= thisWeek ? { pointerEvents: "none", opacity: 0.4 } : undefined}
      >
        →
      </Link>
      {weekStart !== thisWeek && (
        <Link className="btn secondary" href={href(base, extra)}>
          This week
        </Link>
      )}
    </div>
  );
}
