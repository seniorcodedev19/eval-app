"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";
import type { TeamWeekRow } from "@/lib/types";
import StatusPill from "./StatusPill";

const sorts = {
  total_desc: (a: TeamWeekRow, b: TeamWeekRow) => b.total - a.total || a.name.localeCompare(b.name),
  total_asc: (a: TeamWeekRow, b: TeamWeekRow) => a.total - b.total || a.name.localeCompare(b.name),
  achievement_desc: (a: TeamWeekRow, b: TeamWeekRow) => (b.achievement_pct ?? -1) - (a.achievement_pct ?? -1),
  name: (a: TeamWeekRow, b: TeamWeekRow) => a.name.localeCompare(b.name),
};
type SortKey = keyof typeof sorts;

// Bar chart of the team's weekly totals with a choice of ordering.
export default function RankBars({ rows }: { rows: TeamWeekRow[] }) {
  const [sort, setSort] = useState<SortKey>("total_desc");
  if (rows.length === 0) return <div className="panel empty">No active people in this team yet.</div>;

  const sorted = [...rows].sort(sorts[sort]);
  const max = Math.max(...rows.map((r) => r.total), 0.0001);

  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <label htmlFor="order">Order by</label>
          <select id="order" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="total_desc">Points, high to low</option>
            <option value="total_asc">Points, low to high</option>
            <option value="achievement_desc">Achievement %, high to low</option>
            <option value="name">Name, A to Z</option>
          </select>
        </div>
      </div>
      <ol className="rank">
        {sorted.map((r) => (
          <li key={r.user_id}>
            <div className="nm">
              {r.name} <StatusPill status={r.status} />
            </div>
            <div className="track" role="img" aria-label={`${r.name}: ${fmt(r.total)} points`}>
              <span
                className={r.status === "approved" ? "ok" : r.status === "submitted" ? "wait" : ""}
                style={{ width: `${Math.max((r.total / max) * 100, r.has_data ? 2 : 0)}%` }}
              />
            </div>
            <div className="val">{r.has_data ? fmt(r.total) : "–"}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
