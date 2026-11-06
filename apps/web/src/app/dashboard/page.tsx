import Accordion from "@/components/Accordion";
import Breakdown from "@/components/Breakdown";
import PointsChart from "@/components/PointsChart";
import StatTiles from "@/components/StatTiles";
import StatusPill from "@/components/StatusPill";
import TeamTiles from "@/components/TeamTiles";
import { TeamDailyDonut, TeamStatusDonut } from "@/components/TeamOverview";
import TeamWeekTable from "@/components/TeamWeekTable";
import WeekGrid from "@/components/WeekGrid";
import WeekPicker from "@/components/WeekPicker";
import { apiFetch, tryFetch } from "@/lib/api";
import { addDays, weekParam } from "@/lib/dates";
import type { TeamWeekRow, User, WeekData } from "@/lib/types";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const week = weekParam(sp.week);
  const wq = week ? `?week_start=${week}` : "";
  const me = await apiFetch<User>("/me");
  const manager = me.role !== "member";

  const [data, team] = await Promise.all([
    tryFetch<WeekData>(`/week${wq}`),
    tryFetch<{ rows: TeamWeekRow[] }>(`/team-week${wq}`),
  ]);

  if (!data.ok) return <div className="banner error">{data.error}</div>;
  const d = data.data;
  const rows = team.ok ? team.data.rows.filter((r) => r.role !== "admin") : [];

  // Last week, only to show the change on the team tiles.
  const prev = await tryFetch<{ rows: TeamWeekRow[] }>(
    `/team-week?week_start=${addDays(d.week_start, -7)}`,
  );
  const prevRows = prev.ok ? prev.data.rows.filter((r) => r.role !== "admin") : null;

  return (
    <>
      <div className="head">
        <div>
          <h1>Dashboard</h1>
          <p className="sub" style={{ margin: 0 }}>
            Team points and weekly results.
          </p>
        </div>
        <WeekPicker
          base="/dashboard"
          weekStart={d.week_start}
          weekEnd={d.week_end}
          today={d.today}
          trailing={
            manager ? (
              <a className="chip" href={`/api/proxy/export.csv?week_start=${d.week_start}`}>
                CSV
              </a>
            ) : null
          }
        />
      </div>

      {rows.length > 0 ? <TeamTiles rows={rows} prevRows={prevRows} /> : null}
      {me.role !== "admin" ? <StatTiles data={d} /> : null}

      {rows.length > 0 ? (
        <div className="two" style={{ marginBottom: 12 }}>
          <div className="panel">
            <h2 className="panel-title">Team overview</h2>
            <TeamStatusDonut rows={rows} />
          </div>
          <div className="panel">
            <h2 className="panel-title">Team daily score</h2>
            <TeamDailyDonut rows={rows} days={d.days} />
          </div>
        </div>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        {!team.ok ? (
          <Accordion title="Everyone's points">
            <div className="banner error">{team.error}</div>
          </Accordion>
        ) : rows.length === 0 ? (
          <Accordion title="Everyone's points">
            <div className="empty">No people to chart yet this week.</div>
          </Accordion>
        ) : (
          <PointsChart rows={rows} meId={me.id} week={d.week_start} />
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <Accordion title="Team results">
          {!team.ok ? (
            <div className="banner error">{team.error}</div>
          ) : (
            <TeamWeekTable me={me} weekStart={d.week_start} rows={rows} metrics={d.metrics} />
          )}
        </Accordion>
      </div>

      {me.role !== "admin" && (
        <div style={{ marginBottom: 12 }}>
          <Accordion title="My week">
            <div className="row" style={{ marginBottom: 12 }}>
              <StatusPill status={d.status} />
            </div>
            {d.metrics.length === 0 ? (
              <div className="empty">
                <strong>No metrics to report on yet.</strong>
                <div>An admin adds the metrics your team reports on.</div>
              </div>
            ) : (
              <>
                <WeekGrid key={d.week_start} data={d} />
                <div style={{ marginTop: 16 }}>
                  <Breakdown score={d.score} />
                </div>
              </>
            )}
          </Accordion>
        </div>
      )}
    </>
  );
}
