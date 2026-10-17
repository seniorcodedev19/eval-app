import type { HistoryPoint } from "@/lib/types";

export default function Trend({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) {
    return <p className="muted">The trend appears once there are results for two or more weeks.</p>;
  }
  const max = Math.max(...points.map((p) => p.total), 1);
  return (
    <div className="panel">
      <div className="trend" role="img" aria-label="Total points per week">
        {points.map((p) => (
          <div className="col" key={p.week_start}>
            <small>{Math.round(p.total * 10) / 10}</small>
            <div className="b" style={{ height: `${Math.max((p.total / max) * 100, 2)}%` }} />
            <small>{p.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
