import Breakdown from "@/components/Breakdown";
import ColumnChart from "@/components/ColumnChart";
import MetricsManager from "@/components/MetricsManager";
import RankBars from "@/components/RankBars";
import ReviewQueue from "@/components/ReviewQueue";
import StatusPill from "@/components/StatusPill";
import WeekGrid from "@/components/WeekGrid";
import WeekPicker from "@/components/WeekPicker";
import { apiFetch, tryFetch } from "@/lib/api";
import { weekParam } from "@/lib/dates";
import type { HistoryPoint, Metric, QueueItem, Team, TeamWeekRow, User, WeekData } from "@/lib/types";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const week = weekParam(sp.week);
  const wq = week ? `?week_start=${week}` : "";

  const me = await apiFetch<User>("/me");
  const manager = me.role !== "member";

  const [data, history, queue, team, metrics, teams] = await Promise.all([
    tryFetch<WeekData>(`/week${wq}`),
    tryFetch<HistoryPoint[]>("/history"),
    manager ? tryFetch<QueueItem[]>("/review-queue") : null,
    manager ? tryFetch<{ rows: TeamWeekRow[] }>(`/team-week${wq}`) : null,
    manager ? tryFetch<Metric[]>("/metrics") : null,
    me.role === "admin" ? tryFetch<Team[]>("/teams") : null,
  ]);

  if (!data.ok) return <div className="banner error">{data.error}</div>;
  const d = data.data;

  return (
    <>
      <div className="head">
        <div>
          <h1>Report</h1>
          <p className="sub" style={{ margin: 0 }}>
            Enter your numbers day by day, then submit the week for review.
          </p>
        </div>
        <WeekPicker base="/report" weekStart={d.week_start} weekEnd={d.week_end} today={d.today} />
      </div>

      <div className="row" style={{ marginBottom: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>My week</h2>
        <StatusPill status={d.status} />
      </div>
      <WeekGrid key={d.week_start} data={d} />
      <div style={{ marginTop: 16 }}>
        <Breakdown score={d.score} />
      </div>

      <h2>Recent weeks</h2>
      {history.ok && history.data.length > 0 ? (
        <div className="panel">
          <ColumnChart
            label="Total points per week"
            items={history.data.map((p) => ({ label: p.label, value: p.total, highlight: p.week_start === d.week_start }))}
          />
        </div>
      ) : (
        <p className="muted">Your weekly totals show up here once you have entered some numbers.</p>
      )}

      {manager && (
        <>
          <h2>Waiting for your review</h2>
          {queue?.ok ? <ReviewQueue items={queue.data} /> : <div className="banner error">{queue?.error}</div>}

          <div className="head" style={{ marginTop: 32, marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Team, this week</h2>
            <a className="btn secondary" href={`/api/proxy/export.csv?week_start=${d.week_start}`}>
              Download CSV
            </a>
          </div>
          {team?.ok ? <RankBars rows={team.data.rows} /> : <div className="banner error">{team?.error}</div>}

          <h2>Metrics</h2>
          <p className="sub" style={{ marginTop: -4 }}>
            Metrics your team reports on. Weight and target changes apply to weeks that aren&apos;t approved yet.
          </p>
          {metrics?.ok ? (
            <MetricsManager me={me} metrics={metrics.data} teams={teams?.ok ? teams.data : []} />
          ) : (
            <div className="banner error">{metrics?.error}</div>
          )}
        </>
      )}
    </>
  );
}
