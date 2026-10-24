import QuerySelect from "@/components/QuerySelect";
import TeamAchievements from "@/components/TeamAchievements";
import WeekPicker from "@/components/WeekPicker";
import { apiFetch, tryFetch } from "@/lib/api";
import { todayUtc, weekParam } from "@/lib/dates";
import type { Team, TeamWeekRow, User } from "@/lib/types";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; team?: string }>;
}) {
  const sp = await searchParams;
  const week = weekParam(sp.week);
  const me = await apiFetch<User>("/me");

  const teams = me.role === "admin" ? await apiFetch<Team[]>("/teams") : [];
  const teamId = me.role === "admin" && sp.team ? Number(sp.team) : undefined;
  const qs = [week ? `week_start=${week}` : "", teamId ? `team_id=${teamId}` : ""].filter(Boolean).join("&");
  const res = await tryFetch<{ week_start: string; week_end: string; rows: TeamWeekRow[] }>(
    `/team-week${qs ? `?${qs}` : ""}`,
  );

  if (!res.ok) return <div className="banner error">{res.error}</div>;

  const extra: Record<string, string> = {};
  if (sp.team) extra.team = sp.team;

  return (
    <>
      <div className="head">
        <div>
          <h1>Team</h1>
          <p className="sub" style={{ margin: 0 }}>
            People waiting for review this week. Open a name for the daily form and trend.
          </p>
        </div>
        <WeekPicker
          base="/team"
          weekStart={res.data.week_start}
          weekEnd={res.data.week_end}
          today={todayUtc()}
          extra={extra}
          trailing={
            <>
              {me.role === "admin" && (
                <QuerySelect
                  base="/team"
                  name="team"
                  label="Team"
                  value={sp.team ?? ""}
                  extra={week ? { week } : {}}
                  options={[
                    { value: "", label: "All teams" },
                    ...teams.map((t) => ({ value: String(t.id), label: t.name })),
                  ]}
                />
              )}
              {me.role !== "member" && (
                <a className="chip" href={`/api/proxy/export.csv?${qs || `week_start=${res.data.week_start}`}`}>
                  CSV
                </a>
              )}
            </>
          }
        />
      </div>

      <TeamAchievements me={me} weekStart={res.data.week_start} rows={res.data.rows} />
    </>
  );
}
