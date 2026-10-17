import type { TrendPoint } from "@/lib/types";

export default function Trend({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return <p className="muted">The trend appears once there are results for two or more periods.</p>;
  }
  const max = Math.max(...points.map((p) => p.total), 1);
  return (
    <div className="panel">
      <div className="trend" role="img" aria-label="Total points per period">
        {points.map((p) => (
          <div className="col" key={p.period_id}>
            <small>{Math.round(p.total * 10) / 10}</small>
            <div className="b" style={{ height: `${Math.max((p.total / max) * 100, 2)}%` }} />
            <small>{p.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
