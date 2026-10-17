import { fmt } from "@/lib/format";
import type { Metric, Score } from "@/lib/types";

export default function ProgressList({ score, metrics }: { score: Score; metrics: Metric[] }) {
  const unit = (id: number) => metrics.find((m) => m.id === id)?.unit ?? "";
  return (
    <div className="progress">
      {score.breakdown.map((b) => {
        const u = unit(b.metric_id);
        if (b.formula_type === "count") {
          return (
            <div key={b.metric_id}>
              <div className="top">
                <span>{b.name}</span>
                <span className="muted">
                  {fmt(b.done)} {u} · +{fmt(b.base)} pts
                </span>
              </div>
            </div>
          );
        }
        const pct = b.planned > 0 ? (b.done / b.planned) * 100 : 0;
        return (
          <div key={b.metric_id}>
            <div className="top">
              <span>{b.name}</span>
              <span className="muted">
                {fmt(b.done)} of {fmt(b.planned)} {u} · {Math.round(pct)}%
              </span>
            </div>
            <div className="track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={b.name}>
              <span className={pct > 100 ? "over" : ""} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
