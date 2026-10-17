import Breakdown from "@/components/Breakdown";
import LineChart from "@/components/LineChart";
import RankBars from "@/components/RankBars";
import StatusPill from "@/components/StatusPill";
import WeekGrid from "@/components/WeekGrid";
import WeekPicker from "@/components/WeekPicker";
import { apiFetch, tryFetch } from "@/lib/api";
import { weekParam } from "@/lib/dates";
import type { TeamWeekRow, User, WeekData } from "@/lib/types";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const week = weekParam((await searchParams).week);
  const wq = week ? `?week_start=${week}` : "";
  const me = await apiFetch<User>("/me");
  const manager = me.role !== "member";

  const [data, team] = await Promise.all([
    tryFetch<WeekData>(`/week${wq}`),
    tryFetch<{ rows: TeamWeekRow[] }>(`/team-week${wq}`),
  ]);

  if (!data.ok) return <div className="banner error">{data.error}</div>;
  const d = data.data;
  const rows = team.ok ? team.data.rows : [];
  const lines = rows
    .filter((r) => (r.day_points ?? []).some((v) => v > 0) || r.user_id === me.id)
    .map((r) => ({
      id: r.user_id,
      name: r.name,
      values: r.day_points?.length ? r.day_points : d.days.map(() => 0),
    }));

  return (
    <>
      <div className="head">
        <div>
          <h1>Everyone&apos;s points</h1>
          <p className="sub" style={{ margin: 0 }}>
            Daily points for the team this week. Your line is thicker.
          </p>
        </div>
        <WeekPicker base="/dashboard" weekStart={d.week_start} weekEnd={d.week_end} today={d.today} />
      </div>

      <div className="panel">
        {lines.length === 0 ? (
          <div className="empty">No points to chart yet this week.</div>
        ) : (
          <LineChart days={d.days} series={lines} meId={me.id} label="Everyone's points each day this week" />
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
