import Breakdown from "@/components/Breakdown";
import ColumnChart, { type Col } from "@/components/ColumnChart";
import RankBars from "@/components/RankBars";
import StatusPill from "@/components/StatusPill";
import WeekGrid from "@/components/WeekGrid";
import WeekPicker from "@/components/WeekPicker";
import { apiFetch, tryFetch } from "@/lib/api";
import { weekParam } from "@/lib/dates";
import type { TeamWeekRow, User, WeekData } from "@/lib/types";

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[0] || name;
}

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
  const bars: Col[] = rows.map((r) => ({
    label: shortName(r.name),
    value: r.total,
    highlight: r.user_id === me.id,
    tone: r.status === "approved" ? "ok" : r.status === "submitted" ? "wait" : "muted",
  }));

  return (
    <>
      <div className="head">
        <div>
          <h1>Everyone&apos;s points</h1>
          <p className="sub" style={{ margin: 0 }}>
            Points this week for each person. Your bar is outlined.
          </p>
        </div>
        <WeekPicker base="/dashboard" weekStart={d.week_start} weekEnd={d.week_end} today={d.today} />
      </div>

      <div className="panel">
        {!team.ok ? (
          <div className="banner error">{team.error}</div>
        ) : bars.length === 0 ? (
          <div className="empty">No people to chart yet this week.</div>
        ) : (
          <ColumnChart className="people" items={bars} label="Everyone's points this week" />
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
