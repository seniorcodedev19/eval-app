"use client";

import type { TeamWeekRow } from "@/lib/types";
import ColumnChart from "./ColumnChart";
import RankBars from "./RankBars";

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[0] || name;
}

export default function TeamResults({ rows, meId }: { rows: TeamWeekRow[]; meId?: number }) {
  if (rows.length === 0) return <div className="panel empty">No active people on this team yet.</div>;

  const visible = rows.filter((r) => r.has_data || r.status === "submitted" || r.status === "approved");

  return (
    <div className="stack">
      {visible.length === 0 ? (
        <div className="panel empty">No submitted or approved results this week yet.</div>
      ) : (
      <div className="panel">
        <div className="head" style={{ marginBottom: 8 }}>
          <div>
            <strong>Everyone this week</strong>
            <div className="muted">Compare points after people submit. Approved scores are locked in.</div>
          </div>
        </div>
        <ColumnChart
          className="people"
          label="Points this week for everyone"
          items={visible.map((r) => ({
            label: shortName(r.name),
            value: r.total,
            highlight: r.user_id === meId,
            tone: r.status === "approved" ? "ok" : r.status === "submitted" ? "wait" : "muted",
          }))}
        />
        <p className="muted" style={{ margin: "12px 0 0", fontSize: 13 }}>
          Teal is approved. Amber is waiting for review. Your bar is outlined.
        </p>
      </div>
      )}
      <RankBars rows={rows} />
    </div>
  );
}
