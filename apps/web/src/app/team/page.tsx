import Link from "next/link";
import { redirect } from "next/navigation";
import ApproveWeekButton from "@/components/ApproveWeekButton";
import ReportStatusControl from "@/components/ReportStatusControl";
import WeekPicker from "@/components/WeekPicker";
import { apiFetch, tryFetch } from "@/lib/api";
import { todayUtc, weekParam } from "@/lib/dates";
import { fmt } from "@/lib/format";
import type { Team, TeamWeekRow, User } from "@/lib/types";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; team?: string }>;
}) {
  const sp = await searchParams;
  const week = weekParam(sp.week);
  const me = await apiFetch<User>("/me");
  if (me.role === "member") redirect("/dashboard");

  const teams = me.role === "admin" ? await apiFetch<Team[]>("/teams") : [];
  const teamId = me.role === "admin" && sp.team ? Number(sp.team) : undefined;
  const qs = [week ? `week_start=${week}` : "", teamId ? `team_id=${teamId}` : ""].filter(Boolean).join("&");
  const res = await tryFetch<{ week_start: string; week_end: string; rows: TeamWeekRow[] }>(
    `/team-week${qs ? `?${qs}` : ""}`,
  );

  if (!res.ok) return <div className="banner error">{res.error}</div>;

  const extra: Record<string, string> = {};
  if (sp.team) extra.team = sp.team;

  return (
    <>
      <div className="head">
        <div>
          <h1>Team</h1>
          <p className="sub" style={{ margin: 0 }}>
            Weekly points from results and tracked time (Sunday to Saturday). Open a person for the form, breakdown, and trend.
          </p>
        </div>
        <div className="row">
          {me.role === "admin" && (
            <form>
              {week && <input type="hidden" name="week" value={week} />}
              <label htmlFor="team">Team</label>
              <select id="team" name="team" defaultValue={sp.team ?? ""}>
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>{" "}
              <button className="btn secondary" type="submit">
                Filter
              </button>
            </form>
          )}
          <WeekPicker
            base="/team"
            weekStart={res.data.week_start}
            weekEnd={res.data.week_end}
            today={todayUtc()}
            extra={extra}
          />
        </div>
      </div>

      {res.data.rows.length === 0 ? (
        <div className="panel empty">No active people in this team yet.</div>
      ) : (
        <div className="panel tablewrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Status</th>
                <th className="n">Achievement</th>
                <th className="n">Bonus</th>
                <th className="n">Points</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {res.data.rows.map((r) => (
                <tr key={r.user_id}>
                  <td>
                    <Link href={`/team/${r.user_id}?week=${res.data.week_start}`}>
                      {r.name}
                    </Link>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {r.email}
                    </div>
                  </td>
                  <td>
                    <span className="pill">{r.role}</span>
                  </td>
                  <td>
                    <ReportStatusControl
                      userId={r.user_id}
                      weekStart={res.data.week_start}
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
                  <td>
                    {r.status === "submitted" && r.report_id && r.user_id !== me.id ? (
                      <ApproveWeekButton reportId={r.report_id} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 16 }}>
        <a className="btn secondary" href={`/api/proxy/export.csv?${qs || `week_start=${res.data.week_start}`}`}>
          Download CSV
        </a>
      </p>
    </>
  );
}
