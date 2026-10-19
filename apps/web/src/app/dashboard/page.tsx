import Breakdown from "@/components/Breakdown";
import PointsChart from "@/components/PointsChart";
import RankBars from "@/components/RankBars";
import StatusPill from "@/components/StatusPill";
import TeamTimeChart from "@/components/TeamTimeChart";
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
          <h1>Everyone&apos;s points</h1>
          <p className="sub" style={{ margin: 0 }}>
            Points this week for each person. Your bar is outlined.
          </p>
        </div>
        <WeekPicker
          base="/dashboard"
          weekStart={d.week_start}
          weekEnd={d.week_end}
          today={d.today}
          extra={timeWeek ? { time_week: timeWeek } : {}}
        />
      </div>

      {hours.ok ? (
        <div style={{ marginBottom: 16 }}>
          <TeamTimeChart data={hours.data} meId={me.id} extra={week ? { week } : {}} />
        </div>
      ) : (
        <div className="banner error" style={{ marginBottom: 16 }}>
          {hours.error}
        </div>
      )}

      <div className="panel">
        {!team.ok ? (
          <div className="banner error">{team.error}</div>
        ) : rows.length === 0 ? (
          <div className="empty">No people to chart yet this week.</div>
        ) : (
          <PointsChart rows={rows} meId={me.id} />
        )}
      </div>

      <div className="head" style={{ marginTop: 32 }}>
        <div className="row" style={{ alignItems: "center", margin: 0 }}>
          <h2 style={{ margin: 0 }}>My week</h2>
          <StatusPill status={d.status} />
        </div>
        {manager && (
          <a className="btn secondary" href={`/api/proxy/export.csv?week_start=${d.week_start}`}>
            Download CSV
          </a>
        )}
      </div>

      {d.metrics.length === 0 ? (
        <div className="panel empty">
          <strong>No metrics to report on yet.</strong>
          <div>
            {me.role === "admin" ? "Add them under Admin." : "An admin adds the metrics your team reports on."}
          </div>
        </div>
      ) : (
        <>
          <WeekGrid key={d.week_start} data={d} />
          <div style={{ marginTop: 16 }}>
            <Breakdown score={d.score} />
          </div>
        </>
      )}

      <h2>Leaderboard</h2>
      {team.ok ? <RankBars rows={rows} /> : <div className="banner error">{team.error}</div>}
    </>
  );
}
