"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";
import type { TeamWeekRow } from "@/lib/types";
import Accordion from "./Accordion";
import Dropdown from "./Dropdown";
import PersonCell from "./PersonCell";
import StatusPill from "./StatusPill";

const sorts = {
  total_desc: (a: TeamWeekRow, b: TeamWeekRow) => b.total - a.total || a.name.localeCompare(b.name),
  total_asc: (a: TeamWeekRow, b: TeamWeekRow) => a.total - b.total || a.name.localeCompare(b.name),
  achievement_desc: (a: TeamWeekRow, b: TeamWeekRow) => (b.achievement_pct ?? -1) - (a.achievement_pct ?? -1),
  name: (a: TeamWeekRow, b: TeamWeekRow) => a.name.localeCompare(b.name),
};
type SortKey = keyof typeof sorts;

// Bar chart of the team's weekly totals with a choice of ordering.
export default function RankBars({ rows, week }: { rows: TeamWeekRow[]; week?: string }) {
  const [sort, setSort] = useState<SortKey>("total_desc");
  const sorted = [...rows].sort(sorts[sort]);
  const max = Math.max(...rows.map((r) => r.total), 0.0001);

  return (
    <Accordion
      title="Leaderboard"
      actions={
        rows.length > 0 ? (
          <div className="filters">
            <Dropdown<SortKey>
              id="order"
              ariaLabel="Order by"
              value={sort}
              onChange={setSort}
              options={[
                { value: "total_desc", label: "Points, high to low" },
                { value: "total_asc", label: "Points, low to high" },
                { value: "achievement_desc", label: "Achievement %, high to low" },
                { value: "name", label: "Name, A to Z" },
              ]}
            />
          </div>
        ) : null
      }
    >
      {rows.length === 0 ? (
        <div className="empty">No active people in this team yet.</div>
      ) : (
      <ol className="rank">
        {sorted.map((r) => (
          <li key={r.user_id}>
            <div className="nm">
              <PersonCell
                name={r.name}
                email={r.email}
                avatar={r.avatar}
                href={week ? `/team/${r.user_id}?week=${week}` : undefined}
                size={28}
              />{" "}
              <StatusPill status={r.status} />
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
      )}
    </Accordion>
  );
}
