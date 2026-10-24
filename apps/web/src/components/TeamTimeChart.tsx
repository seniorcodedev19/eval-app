import Accordion from "@/components/Accordion";
import LineChart from "@/components/LineChart";
import WeekPicker from "@/components/WeekPicker";
import type { TimeTeamWeek } from "@/lib/types";

export default function TeamTimeChart({
  data,
  meId,
  extra = {},
}: {
  data: TimeTeamWeek;
  meId: number;
  extra?: Record<string, string>;
}) {
  const series = data.rows.map((r) => ({
    id: r.user_id,
    name: r.name,
    email: r.email,
    avatar: r.avatar,
    values: r.by_day.map((m) => Math.round((m / 60) * 10) / 10),
  }));

  return (
    <Accordion
      title="Everyone's hours"
      actions={
        <WeekPicker
          base="/dashboard"
          param="time_week"
          selectId="time-week"
          weekStart={data.week_start}
          weekEnd={data.week_end}
          today={data.today}
          extra={extra}
        />
      }
    >
      {series.length === 0 ? (
        <div className="empty">No people to chart yet this week.</div>
      ) : (
        <LineChart days={data.days} series={series} meId={meId} label="Hours logged by each person this week" />
      )}
    </Accordion>
  );
}
