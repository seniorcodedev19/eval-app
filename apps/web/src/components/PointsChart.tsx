"use client";

import { useMemo, useState } from "react";
import type { TeamWeekRow } from "@/lib/types";
import ColumnChart from "./ColumnChart";

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[0] || name;
}

function metricDone(r: TeamWeekRow, metricId: number) {
  return r.metric_points?.find((m) => m.id === metricId)?.done ?? 0;
}

function chartUnit(unit?: string) {
  if (!unit) return "";
  if (unit === "hours") return " h";
  return ` ${unit}`;
}

export default function PointsChart({ rows, meId, week }: { rows: TeamWeekRow[]; meId: number; week: string }) {
  const metrics = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of rows) for (const m of r.metric_points ?? []) map.set(m.id, m.name);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const [sort, setSort] = useState("total_desc");
  const metricId = sort.startsWith("metric:") ? Number(sort.slice(7)) : null;

  const sorted = [...rows].sort((a, b) => {
    if (sort === "team") {
      return (a.team_name ?? "zzz").localeCompare(b.team_name ?? "zzz") || a.name.localeCompare(b.name);
    }
    if (metricId !== null) {
      return metricDone(b, metricId) - metricDone(a, metricId) || a.name.localeCompare(b.name);
    }
    if (sort === "total_asc") return a.total - b.total || a.name.localeCompare(b.name);
    return b.total - a.total || a.name.localeCompare(b.name);
  });

  const metricName = metrics.find((m) => m.id === metricId)?.name;
  const metricUnit =
    metricId === null
      ? ""
      : chartUnit(rows.map((r) => r.metric_points?.find((m) => m.id === metricId)?.unit).find(Boolean));
  const items = sorted.map((r) => ({
    label: sort === "team" && r.team_name ? `${shortName(r.name)} · ${r.team_name}` : shortName(r.name),
    value: metricId !== null ? metricDone(r, metricId) : r.total,
    highlight: r.user_id === meId,
    tone: (r.status === "approved" ? "ok" : r.status === "submitted" ? "wait" : "muted") as "ok" | "wait" | "muted",
    href: `/team/${r.user_id}?week=${week}`,
    name: r.name,
    email: r.email,
    avatar: r.avatar,
  }));

  return (
    <>
      <div className="filters" style={{ marginBottom: 16 }}>
        <select id="chart-order" aria-label="Order by" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="total_desc">Points, high to low</option>
          <option value="total_asc">Points, low to high</option>
          <option value="team">Team, A to Z</option>
          {metrics.map((m) => (
            <option key={m.id} value={`metric:${m.id}`}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <ColumnChart
        className="people"
        items={items}
        unit={metricId !== null ? metricUnit : ""}
        label={metricName ? `${metricName} this week` : "Everyone's points this week"}
      />
    </>
  );
}
