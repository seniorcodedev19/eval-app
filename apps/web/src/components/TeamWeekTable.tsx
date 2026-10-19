import ApproveWeekButton from "@/components/ApproveWeekButton";
import PersonCell from "@/components/PersonCell";
import ReportStatusControl from "@/components/ReportStatusControl";
import { fmt } from "@/lib/format";
import type { TeamWeekRow, User } from "@/lib/types";

export default function TeamWeekTable({
  me,
  weekStart,
  rows,
}: {
  me: User;
  weekStart: string;
  rows: TeamWeekRow[];
}) {
  if (rows.length === 0) return <div className="empty">No active people in this team yet.</div>;
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Person</th>
            <th>Role</th>
            <th>Status</th>
            <th className="n">Achievement</th>
            <th className="n">Bonus</th>
            <th className="n">Points</th>
            {me.role !== "member" ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id}>
              <td>
                <PersonCell
                  name={r.name}
                  email={r.email}
                  avatar={r.avatar}
                  href={`/team/${r.user_id}?week=${weekStart}`}
                  sub={r.email}
                />
              </td>
              <td>
                <span className="pill">{r.role}</span>
              </td>
              <td>
                <ReportStatusControl
                  userId={r.user_id}
                  weekStart={weekStart}
                  status={r.status}
                  canEdit={me.role === "admin"}
                />
              </td>
              {r.has_data ? (
                <>
                  <td className="n">{r.achievement_pct === null ? "n/a" : `${fmt(r.achievement_pct)}%`}</td>
                  <td className="n">{fmt(r.bonus)}</td>
                  <td className="n">
                    <strong>{fmt(r.total)}</strong>
                  </td>
                </>
              ) : (
                <td className="n muted" colSpan={3}>
                  No results yet
                </td>
              )}
              {me.role !== "member" ? (
                <td>
                  {r.status === "submitted" && r.report_id && r.user_id !== me.id ? (
                    <ApproveWeekButton reportId={r.report_id} />
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
