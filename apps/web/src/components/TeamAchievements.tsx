import Accordion from "@/components/Accordion";
import ApproveWeekButton from "@/components/ApproveWeekButton";
import PersonCell from "@/components/PersonCell";
import StatusPill from "@/components/StatusPill";
import { fmt } from "@/lib/format";
import type { TeamWeekRow, User } from "@/lib/types";

function metricsOf(rows: TeamWeekRow[]) {
  const map = new Map<number, string>();
  for (const r of rows) for (const m of r.metric_points ?? []) map.set(m.id, m.name);
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([id, name]) => ({ id, name }));
}

export default function TeamAchievements({
  me,
  weekStart,
  rows,
}: {
  me: User;
  weekStart: string;
  rows: TeamWeekRow[];
}) {
  if (rows.length === 0) return <div className="empty">No active people in this team yet.</div>;
  const metrics = metricsOf(rows);

  return (
    <div>
      {rows.map((r) => {
        const byId = new Map((r.metric_points ?? []).map((m) => [m.id, m]));
        return (
          <Accordion
            key={r.user_id}
            title={
              <>
                <PersonCell
                  name={r.name}
                  email={r.email}
                  avatar={r.avatar}
                  href={`/team/${r.user_id}?week=${weekStart}`}
                  sub={r.email}
                />
                <span className="accordion-facts">
                  <StatusPill status={r.status} />
                  <span className="muted">
                    {r.achievement_pct === null || !r.has_data ? "n/a" : `${fmt(r.achievement_pct)}%`}
                  </span>
                  <strong>{r.has_data ? fmt(r.total) : "–"}</strong>
                </span>
              </>
            }
          >
            {!r.has_data || metrics.length === 0 ? (
              <div className="empty">No metric results yet this week.</div>
            ) : (
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th className="n">Done</th>
                      <th className="n">Target</th>
                      <th className="n">Achievement</th>
                      <th className="n">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => {
                      const cell = byId.get(m.id);
                      if (!cell) {
                        return (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            <td className="n muted" colSpan={4}>
                              –
                            </td>
                          </tr>
                        );
                      }
                      const countLike = cell.formula_type === "count";
                      return (
                        <tr key={m.id}>
                          <td>{cell.name}</td>
                          <td className="n">{fmt(cell.done ?? 0)}</td>
                          <td className="n">{countLike || !(cell.planned ?? 0) ? "–" : fmt(cell.planned ?? 0)}</td>
                          <td className="n">
                            {countLike || cell.ratio == null ? "–" : `${fmt(cell.ratio * 100)}%`}
                          </td>
                          <td className="n">
                            <strong>{fmt(cell.points)}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>
                        <strong>Week total</strong>
                      </td>
                      <td className="n muted" colSpan={2}>
                        Bonus {fmt(r.bonus)}
                      </td>
                      <td className="n">{r.achievement_pct === null ? "n/a" : `${fmt(r.achievement_pct)}%`}</td>
                      <td className="n">
                        <strong>{fmt(r.total)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {me.role !== "member" && r.status === "submitted" && r.report_id && r.user_id !== me.id ? (
              <div style={{ marginTop: 12 }}>
                <ApproveWeekButton reportId={r.report_id} />
              </div>
            ) : null}
          </Accordion>
        );
      })}
    </div>
  );
}
