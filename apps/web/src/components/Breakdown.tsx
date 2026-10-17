import type { Score } from "@/lib/types";

const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

// The score, then how each metric contributed to it.
export default function Breakdown({ score }: { score: Score }) {
  if (score.breakdown.length === 0) {
    return (
      <div className="panel empty">
        <strong>No results recorded for this period yet.</strong>
        <div>A manager adds planned and done values for each metric.</div>
      </div>
    );
  }
  const positive = score.breakdown.filter((b) => b.contribution > 0);
  const sum = positive.reduce((s, b) => s + b.contribution, 0);

  return (
    <div className="panel">
      <div className="score">
        <span className="num">{fmt(score.total)}</span>
        <span className="unit">points</span>
      </div>
      <div className="facts">
        <span>
          Achievement <b>{score.achievement_pct === null ? "n/a" : `${fmt(score.achievement_pct)}%`}</b>
        </span>
        <span>
          Base <b>{fmt(score.base)}</b>
        </span>
        <span>
          Bonus <b>{fmt(score.bonus)}</b>
        </span>
      </div>

      <div className="bar" role="img" aria-label="Share of points by metric">
        {positive.map((b) => (
          <span
            key={b.metric_id}
            className={`seg-${score.breakdown.indexOf(b) % 6}`}
            style={{ width: `${(b.contribution / sum) * 100}%` }}
            title={`${b.name}: ${fmt(b.contribution)}`}
          />
        ))}
      </div>

      <div className="tablewrap" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th className="n">Planned</th>
              <th className="n">Done</th>
              <th className="n">Ratio</th>
              <th className="n">Weight</th>
              <th className="n">Bonus</th>
              <th className="n">Points</th>
            </tr>
          </thead>
          <tbody>
            {score.breakdown.map((b, i) => (
              <tr key={b.metric_id}>
                <td>
                  <span className={`dot seg-${i % 6}`} />
                  {b.name}
                </td>
                <td className="n">{b.formula_type === "ratio" ? fmt(b.planned) : "–"}</td>
                <td className="n">{fmt(b.done)}</td>
                <td className="n">{b.formula_type === "ratio" ? (b.na ? "n/a" : `${fmt((b.ratio ?? 0) * 100)}%`) : "–"}</td>
                <td className="n">{fmt(b.weight)}</td>
                <td className="n">{fmt(b.bonus)}</td>
                <td className="n">
                  <strong>{fmt(b.contribution)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
