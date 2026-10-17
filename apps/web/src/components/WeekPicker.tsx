import Link from "next/link";
import { addDays, weekLabel, weekStartOf } from "@/lib/dates";

// Previous / next week links. `thisWeek` is the Sunday of the current week.
export default function WeekPicker({
  base,
  weekStart,
  weekEnd,
  today,
}: {
  base: string;
  weekStart: string;
  weekEnd: string;
  today: string;
}) {
  const thisWeek = weekStartOf(today);
  return (
    <div className="row" style={{ alignItems: "center" }}>
      <Link className="btn secondary" href={`${base}?week=${addDays(weekStart, -7)}`} aria-label="Previous week">
        ←
      </Link>
      <div style={{ minWidth: 150, textAlign: "center" }}>
        <strong>{weekLabel(weekStart, weekEnd)}</strong>
        {weekStart === thisWeek && <div className="muted" style={{ fontSize: 13 }}>This week</div>}
      </div>
      <Link
        className="btn secondary"
        href={`${base}?week=${addDays(weekStart, 7)}`}
        aria-label="Next week"
        aria-disabled={weekStart >= thisWeek}
        style={weekStart >= thisWeek ? { pointerEvents: "none", opacity: 0.4 } : undefined}
      >
        →
      </Link>
      {weekStart !== thisWeek && (
        <Link className="btn secondary" href={base}>
          This week
        </Link>
      )}
    </div>
  );
}
