import { fmt } from "@/lib/format";
import type { TeamWeekRow } from "@/lib/types";

type Tone = "accent" | "ok" | "warn" | "violet";

function TileIcon({ name }: { name: "report" | "people" | "check" | "track" }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "report":
      return (
        <svg {...common}>
          <path d="M5 19V11M10 19V5M15 19v-5M20 19v-9" />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.4 19a5.6 5.6 0 0 1 11.2 0" />
          <path d="M16 5.6a2.9 2.9 0 0 1 0 5.6M17 19a4.6 4.6 0 0 0-1.4-3.3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M20 6.5 9.5 17 4 11.5" />
        </svg>
      );
    case "track":
      return (
        <svg {...common}>
          <path d="M3 16.5 9 10l4 4 7.5-8" />
          <path d="M15 6h5.5v5.5" />
        </svg>
      );
  }
}

/** Change vs last week. null when there is nothing to compare against. */
function Delta({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  return (
    <span className={`tile-sub ${up ? "up" : "down"}`}>
      {up ? "↑" : "↓"}
      {fmt(Math.abs(value))}
      {suffix}
    </span>
  );
}

function Tile({
  label,
  value,
  delta,
  deltaSuffix,
  tone,
  icon,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaSuffix?: string;
  tone: Tone;
  icon: "report" | "people" | "check" | "track";
}) {
  return (
    <div className="tile">
      <span className={`tile-icon tone-${tone}`}>
        <TileIcon name={icon} />
      </span>
      <div className="tile-body">
        <span className="tile-label">{label}</span>
        <span className="tile-value">
          {value}
          <Delta value={delta ?? null} suffix={deltaSuffix} />
        </span>
      </div>
    </div>
  );
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

// Team-level numbers for this week, with the change against last week.
export default function TeamTiles({
  rows,
  prevRows,
}: {
  rows: TeamWeekRow[];
  prevRows: TeamWeekRow[] | null;
}) {
  const pcts = rows.map((r) => r.achievement_pct).filter((p): p is number => p !== null);
  const achievement = pcts.length ? r1(avg(pcts)) : null;
  const points = r1(rows.reduce((s, r) => s + (r.has_data ? r.total : 0), 0));
  const submitted = rows.filter((r) => r.status !== "draft").length;

  let prevAchievement: number | null = null;
  let prevPoints: number | null = null;
  let prevSubmitted: number | null = null;
  if (prevRows) {
    const pp = prevRows.map((r) => r.achievement_pct).filter((p): p is number => p !== null);
    prevAchievement = pp.length ? r1(avg(pp)) : null;
    prevPoints = r1(prevRows.reduce((s, r) => s + (r.has_data ? r.total : 0), 0));
    prevSubmitted = prevRows.filter((r) => r.status !== "draft").length;
  }

  const onTrack = achievement === null ? "—" : achievement >= 100 ? "Yes" : achievement >= 70 ? "Close" : "No";

  return (
    <div className="tiles">
      <Tile
        label="Team achievement"
        value={achievement === null ? "—" : `${achievement}%`}
        delta={achievement !== null && prevAchievement !== null ? r1(achievement - prevAchievement) : null}
        deltaSuffix="%"
        tone="accent"
        icon="report"
      />
      <Tile
        label="Points this week"
        value={fmt(points)}
        delta={prevPoints !== null ? r1(points - prevPoints) : null}
        tone="violet"
        icon="track"
      />
      <Tile
        label="Weeks submitted"
        value={`${submitted} of ${rows.length}`}
        delta={prevSubmitted !== null ? submitted - prevSubmitted : null}
        tone="ok"
        icon="check"
      />
      <Tile
        label="On track"
        value={onTrack}
        tone={onTrack === "Yes" ? "ok" : onTrack === "No" ? "warn" : "accent"}
        icon="people"
      />
    </div>
  );
}

