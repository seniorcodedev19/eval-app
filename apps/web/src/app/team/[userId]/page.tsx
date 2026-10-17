import Link from "next/link";
import Breakdown from "@/components/Breakdown";
import EntryForm from "@/components/EntryForm";
import PeriodPicker from "@/components/PeriodPicker";
import Trend from "@/components/Trend";
import { apiFetch, tryFetch } from "@/lib/api";
import type { Entry, Metric, Period, ScoreResponse, TrendPoint, User } from "@/lib/types";

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { userId } = await params;
  const sp = await searchParams;
  const [me, periods] = await Promise.all([apiFetch<User>("/me"), apiFetch<Period[]>("/periods")]);
  const period = periods.find((p) => p.id === Number(sp.period)) ?? periods[0];
  if (!period) return <div className="panel empty">No periods yet.</div>;

  const [score, entries, metrics, trend] = await Promise.all([
    tryFetch<ScoreResponse>(`/scores?user_id=${userId}&period_id=${period.id}`),
    tryFetch<Entry[]>(`/entries?user_id=${userId}&period_id=${period.id}`),
    tryFetch<Metric[]>("/metrics"),
    tryFetch<TrendPoint[]>(`/trend?user_id=${userId}`),
  ]);

  if (!score.ok) {
    return (
      <>
        <p>
          <Link href="/team">Back to team</Link>
        </p>
        <div className="banner error">{score.error}</div>
      </>
    );
  }

  const person = score.data.user;
  const canEdit = me.role === "admin" || (me.role === "manager" && me.team_id !== null && me.team_id === person.team_id);

  return (
    <>
      <p style={{ margin: "0 0 12px" }}>
        <Link href={`/team?period=${period.id}`}>Back to team</Link>
      </p>
      <div className="head">
        <div>
          <h1>{person.name || person.email}</h1>
          <p className="sub" style={{ margin: 0 }}>
            {person.email}
          </p>
        </div>
        <PeriodPicker periods={periods} value={period.id} />
      </div>

      {period.locked && <div className="banner note">This period is locked. Entries can't be changed.</div>}
      <Breakdown score={score.data.score} />

      {canEdit && entries.ok && metrics.ok && (
        <>
          <h2>Enter results</h2>
          <EntryForm
            key={`${person.id}-${period.id}`}
            userId={person.id}
            periodId={period.id}
            locked={period.locked}
            metrics={metrics.data.filter((m) => m.active)}
            entries={entries.data}
          />
        </>
      )}

      <h2>Trend</h2>
      {trend.ok ? <Trend points={trend.data} /> : <div className="banner error">{trend.error}</div>}
    </>
  );
}
