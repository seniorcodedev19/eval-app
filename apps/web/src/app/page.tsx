import Breakdown from "@/components/Breakdown";
import PeriodPicker from "@/components/PeriodPicker";
import Trend from "@/components/Trend";
import { apiFetch, tryFetch } from "@/lib/api";
import type { Period, ScoreResponse, TrendPoint, User } from "@/lib/types";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const [me, periods] = await Promise.all([apiFetch<User>("/me"), apiFetch<Period[]>("/periods")]);

  if (periods.length === 0) {
    return (
      <>
        <h1>My score</h1>
        <div className="panel empty">
          <strong>No periods yet.</strong>
          <div>{me.role === "admin" ? "Create one under Admin." : "An admin needs to create a review period."}</div>
        </div>
      </>
    );
  }

  const period = periods.find((p) => p.id === Number(sp.period)) ?? periods[0];
  const [score, trend] = await Promise.all([
    tryFetch<ScoreResponse>(`/scores?user_id=${me.id}&period_id=${period.id}`),
    tryFetch<TrendPoint[]>(`/trend?user_id=${me.id}`),
  ]);

  return (
    <>
      <div className="head">
        <div>
          <h1>My score</h1>
          <p className="sub" style={{ margin: 0 }}>
            {me.name || me.email}
          </p>
        </div>
        <PeriodPicker periods={periods} value={period.id} />
      </div>

      {period.locked && <div className="banner note">This period is locked. These are the final scores.</div>}
      {score.ok ? <Breakdown score={score.data.score} /> : <div className="banner error">{score.error}</div>}

      <h2>Trend</h2>
      {trend.ok ? <Trend points={trend.data} /> : <div className="banner error">{trend.error}</div>}
    </>
  );
}
