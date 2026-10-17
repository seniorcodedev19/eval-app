import Link from "next/link";
import ColumnChart from "@/components/ColumnChart";
import ProgressList from "@/components/ProgressList";
import RankBars from "@/components/RankBars";
import StatusPill from "@/components/StatusPill";
import TodayEntry from "@/components/TodayEntry";
import { apiFetch, tryFetch } from "@/lib/api";
import { shortDay, weekLabel } from "@/lib/dates";
import { fmt } from "@/lib/format";
import type { QueueItem, TeamWeekRow, User, WeekData } from "@/lib/types";

export default async function Dashboard() {
  const me = await apiFetch<User>("/me");
  const manager = me.role !== "member";
  const [week, team, queue] = await Promise.all([
    tryFetch<WeekData>("/week"),
    manager ? tryFetch<{ rows: TeamWeekRow[] }>("/team-week") : null,
    manager ? tryFetch<QueueItem[]>("/review-queue") : null,
  ]);

  if (!week.ok) return <div className="banner error">{week.error}</div>;
  const d = week.data;
  const dayNo = d.days.indexOf(d.today) + 1;

  return (
    <>
      <div className="head">
        <div>
          <h1>This week</h1>
          <p className="sub" style={{ margin: 0 }}>
            {weekLabel(d.week_start, d.week_end)}
            {dayNo > 0 && ` · day ${dayNo} of 7`}
          </p>
        </div>
        <StatusPill status={d.status} />
      </div>

      {d.metrics.length === 0 ? (
        <div className="panel empty">
          <strong>No metrics to report on yet.</strong>
          <div>
            {manager ? (
              <>
                Add some on the <Link href="/report">Report</Link> page.
              </>
            ) : (
              "Your manager adds them. If you aren't on a team yet, ask an admin to add you."
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="score">
              <span className="num">{fmt(d.score.total)}</span>
              <span className="unit">points this week</span>
            </div>
            <div className="facts">
              <span>
                Achievement <b>{d.score.achievement_pct === null ? "n/a" : `${fmt(d.score.achievement_pct)}%`}</b>
              </span>
              <span>
                Bonus <b>{fmt(d.score.bonus)}</b>
              </span>
            </div>
            <ProgressList score={d.score} metrics={d.metrics} />
          </div>

          <h2>Points per day</h2>
          <div className="panel">
            <ColumnChart
              label="Points earned each day this week"
              items={d.days.map((day, i) => ({ label: shortDay(day), value: d.day_points[i], highlight: day === d.today }))}
            />
            <p className="muted" style={{ margin: "10px 0 0", fontSize: 13 }}>
              Before the weekly cap on ratio metrics, so the bars can add up to a little more than the total.
            </p>
          </div>

          <h2>Today</h2>
          <TodayEntry key={d.week_start} today={d.today} metrics={d.metrics} daily={d.daily} editable={d.editable} />
          <p className="muted" style={{ marginTop: 10 }}>
            Need another day? Use the <Link href="/report">Report</Link> page.
          </p>
        </>
      )}

      {manager && (
        <>
          <h2>Team this week</h2>
          {queue?.ok && queue.data.length > 0 && (
            <div className="banner note">
              {queue.data.length} {queue.data.length === 1 ? "report is" : "reports are"} waiting for your review.{" "}
              <Link href="/report">Review now</Link>
            </div>
          )}
          {team?.ok ? <RankBars rows={team.data.rows} /> : <div className="banner error">{team?.error}</div>}
        </>
      )}
    </>
  );
}
