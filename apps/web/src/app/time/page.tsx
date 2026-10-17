import ColumnChart from "@/components/ColumnChart";
import TimeTracker from "@/components/TimeTracker";
import WeekPicker from "@/components/WeekPicker";
import { apiFetch, tryFetch } from "@/lib/api";
import { shortDay, weekParam } from "@/lib/dates";
import { hours } from "@/lib/format";
import type { TimeWeek, User } from "@/lib/types";

export default async function TimePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const week = weekParam(sp.week);
  const wq = week ? `?week_start=${week}` : "";

  const me = await apiFetch<User>("/me");
  const [data, team] = await Promise.all([
    tryFetch<TimeWeek>(`/time${wq}`),
    me.role !== "member"
      ? tryFetch<{ rows: { user_id: number; name: string; minutes: number }[] }>(`/time-team${wq}`)
      : null,
  ]);
  if (!data.ok) return <div className="banner error">{data.error}</div>;
  const d = data.data;

  return (
    <>
      <div className="head">
        <div>
          <h1>Time tracking</h1>
          <p className="sub" style={{ margin: 0 }}>
            {hours(d.total_minutes)} logged this week
          </p>
        </div>
        <WeekPicker base="/time" weekStart={d.week_start} weekEnd={d.week_end} today={d.today} />
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <ColumnChart
          label="Hours logged each day"
          unit=" h"
          items={d.days.map((day, i) => ({
            label: shortDay(day),
            value: Math.round((d.by_day[i] / 60) * 10) / 10,
            highlight: day === d.today,
          }))}
        />
      </div>

      <TimeTracker key={d.week_start} data={d} />

      {team?.ok && (
        <>
          <h2>Team hours</h2>
          <div className="panel tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th className="n">Hours</th>
                </tr>
              </thead>
              <tbody>
                {team.data.rows.map((r) => (
                  <tr key={r.user_id}>
                    <td>{r.name}</td>
                    <td className="n">{hours(r.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
