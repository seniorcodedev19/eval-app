import Link from "next/link";
import { redirect } from "next/navigation";
import PeriodPicker from "@/components/PeriodPicker";
import { apiFetch, tryFetch } from "@/lib/api";
import type { Period, Team, TeamRow, User } from "@/lib/types";

const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; team?: string }>;
}) {
  const sp = await searchParams;
  const [me, periods] = await Promise.all([apiFetch<User>("/me"), apiFetch<Period[]>("/periods")]);
  if (me.role === "member") redirect("/");

  if (periods.length === 0) {
    return (
      <>
        <h1>Team</h1>
        <div className="panel empty">No periods yet. An admin can create one under Admin.</div>
      </>
    );
  }

  const period = periods.find((p) => p.id === Number(sp.period)) ?? periods[0];
  const teams = me.role === "admin" ? await apiFetch<Team[]>("/teams") : [];
  const teamId = me.role === "admin" && sp.team ? Number(sp.team) : undefined;
  const qs = `period_id=${period.id}${teamId ? `&team_id=${teamId}` : ""}`;
  const res = await tryFetch<{ period: Period; rows: TeamRow[] }>(`/team-scores?${qs}`);

  return (
    <>
      <div className="head">
        <div>
          <h1>Team</h1>
          <p className="sub" style={{ margin: 0 }}>
            Scores per person for one period. Open a person to see the breakdown and enter results.
          </p>
        </div>
        <div className="row">
          {me.role === "admin" && (
            <form>
              <input type="hidden" name="period" value={period.id} />
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
          <PeriodPicker periods={periods} value={period.id} />
        </div>
      </div>

      {period.locked && <div className="banner note">This period is locked. Entries can't be changed.</div>}
      {!res.ok ? (
        <div className="banner error">{res.error}</div>
      ) : res.data.rows.length === 0 ? (
        <div className="panel empty">No active people in this team yet.</div>
      ) : (
        <div className="panel tablewrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th className="n">Achievement</th>
                <th className="n">Bonus</th>
                <th className="n">Points</th>
              </tr>
            </thead>
            <tbody>
              {res.data.rows.map((r) => (
                <tr key={r.user_id}>
                  <td>
                    <Link href={`/team/${r.user_id}?period=${period.id}`}>{r.name}</Link>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {r.email}
                    </div>
                  </td>
                  <td>
                    <span className="pill">{r.role}</span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 16 }}>
        <a className="btn secondary" href={`/api/proxy/export.csv?${qs}`}>
          Download CSV
        </a>
      </p>
    </>
  );
}
