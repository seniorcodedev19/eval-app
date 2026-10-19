import Accordion from "@/components/Accordion";
import Breakdown from "@/components/Breakdown";
import PointsChart from "@/components/PointsChart";
import RankBars from "@/components/RankBars";
import StatusPill from "@/components/StatusPill";
import TeamTimeChart from "@/components/TeamTimeChart";
import TeamWeekTable from "@/components/TeamWeekTable";
import WeekGrid from "@/components/WeekGrid";
import WeekPicker from "@/components/WeekPicker";
import { apiFetch, tryFetch } from "@/lib/api";
import { weekParam } from "@/lib/dates";
import type { TeamWeekRow, TimeTeamWeek, User, WeekData } from "@/lib/types";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ week?: string; time_week?: string }> }) {
  const sp = await searchParams;
  const week = weekParam(sp.week);
  const timeWeek = weekParam(sp.time_week);
  const wq = week ? `?week_start=${week}` : "";
  const twq = timeWeek ? `?week_start=${timeWeek}` : "";
  const me = await apiFetch<User>("/me");
  const manager = me.role !== "member";

  const [data, team, hours] = await Promise.all([
    tryFetch<WeekData>(`/week${wq}`),
    tryFetch<{ rows: TeamWeekRow[] }>(`/team-week${wq}`),
    tryFetch<TimeTeamWeek>(`/time-team${twq}`),
  ]);

  if (!data.ok) return <div className="banner error">{data.error}</div>;
  const d = data.data;
  const rows = team.ok ? team.data.rows : [];

  return (
    <>
      <div className="head">
        <div>
          <h1>Dashboard</h1>
          <p className="sub" style={{ margin: 0 }}>
            Team points, hours, and weekly results. Open a section to hide or show it.
          </p>
        </div>
        <WeekPicker
          base="/dashboard"
          weekStart={d.week_start}
          weekEnd={d.week_end}
          today={d.today}
          extra={timeWeek ? { time_week: timeWeek } : {}}
          trailing={
            manager ? (
              <a className="chip" href={`/api/proxy/export.csv?week_start=${d.week_start}`}>
                CSV
              </a>
            ) : null
          }
        />
      </div>

      {hours.ok ? (
        <div style={{ marginBottom: 12 }}>
          <TeamTimeChart data={hours.data} meId={me.id} extra={week ? { week } : {}} />
        </div>
      ) : (
        <div className="banner error" style={{ marginBottom: 12 }}>
          {hours.error}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <Accordion title="Everyone's points">
          {!team.ok ? (
            <div className="banner error">{team.error}</div>
          ) : rows.length === 0 ? (
            <div className="empty">No people to chart yet this week.</div>
          ) : (
            <PointsChart rows={rows} meId={me.id} week={d.week_start} />
          )}
        </Accordion>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Accordion title="Team results">
          {!team.ok ? (
            <div className="banner error">{team.error}</div>
          ) : (
            <TeamWeekTable me={me} weekStart={d.week_start} rows={rows} />
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

      <Accordion title="Leaderboard">
        {team.ok ? <RankBars rows={rows} week={d.week_start} /> : <div className="banner error">{team.error}</div>}
      </Accordion>
    </>
  );
}
