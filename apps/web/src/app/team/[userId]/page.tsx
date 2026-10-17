import Link from "next/link";
import { redirect } from "next/navigation";
import Breakdown from "@/components/Breakdown";
import ReportStatusControl from "@/components/ReportStatusControl";
import Trend from "@/components/Trend";
import WeekGrid from "@/components/WeekGrid";
import WeekPicker from "@/components/WeekPicker";
import { apiFetch, tryFetch } from "@/lib/api";
import { weekParam } from "@/lib/dates";
import type { HistoryPoint, User, WeekData } from "@/lib/types";

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { userId } = await params;
  const week = weekParam((await searchParams).week);
  const me = await apiFetch<User>("/me");
  if (me.role === "member") redirect("/dashboard");

  const wq = [`user_id=${userId}`, week ? `week_start=${week}` : ""].filter(Boolean).join("&");
  const [data, trend] = await Promise.all([
    tryFetch<WeekData>(`/week?${wq}`),
    tryFetch<HistoryPoint[]>(`/history?user_id=${userId}`),
  ]);

  if (!data.ok) {
    return (
      <>
        <p>
          <Link href="/team">Back to team</Link>
        </p>
        <div className="banner error">{data.error}</div>
      </>
    );
  }

  const d = data.data;
  const person = d.user;

  return (
    <>
      <p style={{ margin: "0 0 12px" }}>
        <Link href={`/team?week=${d.week_start}`}>Back to team</Link>
      </p>
      <div className="head">
        <div>
          <h1>{person.name || person.email}</h1>
          <p className="sub" style={{ margin: 0 }}>
            {person.email}
          </p>
        </div>
        <div className="row" style={{ alignItems: "center" }}>
          <ReportStatusControl
            userId={person.id}
            weekStart={d.week_start}
            status={d.status}
            canEdit={me.role === "admin"}
          />
          <WeekPicker base={`/team/${person.id}`} weekStart={d.week_start} weekEnd={d.week_end} today={d.today} />
        </div>
      </div>

      {d.metrics.length === 0 ? (
        <div className="panel empty">No metrics to report on yet.</div>
      ) : (
        <WeekGrid key={`${person.id}-${d.week_start}`} data={d} />
      )}

      <div style={{ marginTop: 16 }}>
        <Breakdown score={d.score} />
      </div>

      <h2>Trend</h2>
      {trend.ok ? <Trend points={trend.data} /> : <div className="banner error">{trend.error}</div>}
    </>
  );
}
