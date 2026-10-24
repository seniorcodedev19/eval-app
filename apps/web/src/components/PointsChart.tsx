"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TeamWeekRow } from "@/lib/types";
import { fmt } from "@/lib/format";
import { useBusy } from "./Busy";
import Accordion from "./Accordion";
import Avatar from "./Avatar";

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

const toneFill = {
  ok: "var(--s0)",
  wait: "var(--s2)",
  muted: "var(--line)",
};

type Item = {
  label: string;
  value: number;
  highlight: boolean;
  tone: "ok" | "wait" | "muted";
  href: string;
  name: string;
  email: string;
  avatar?: string | null;
};

function PersonTick({ x, y, payload, index, items }: { x?: string | number; y?: string | number; payload?: { value?: string }; index?: number; items: Item[] }) {
  const item = typeof index === "number" ? items[index] : undefined;
  if (x == null || y == null || !item) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-14} y={6} width={28} height={28}>
        <Avatar name={item.name} email={item.email} src={item.avatar} size={28} />
      </foreignObject>
      <text y={48} textAnchor="middle" fill="var(--muted)" fontSize={12}>
        {payload?.value ?? item.label}
      </text>
    </g>
  );
}

export default function PointsChart({ rows, meId, week }: { rows: TeamWeekRow[]; meId: number; week: string }) {
  const router = useRouter();
  const { startNav } = useBusy();
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
  const unit =
    metricId === null
      ? ""
      : chartUnit(rows.map((r) => r.metric_points?.find((m) => m.id === metricId)?.unit).find(Boolean));
  const items: Item[] = sorted.map((r) => ({
    label: sort === "team" && r.team_name ? `${shortName(r.name)} · ${r.team_name}` : shortName(r.name),
    value: metricId !== null ? metricDone(r, metricId) : r.total,
    highlight: r.user_id === meId,
    tone: (r.status === "approved" ? "ok" : r.status === "submitted" ? "wait" : "muted") as "ok" | "wait" | "muted",
    href: `/team/${r.user_id}?week=${week}`,
    name: r.name,
    email: r.email,
    avatar: r.avatar,
  }));
  const title = metricName ? `${metricName} this week` : "Everyone's points this week";

  return (
    <Accordion
      title="Everyone's points"
      actions={
        <div className="filters">
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
      }
    >
      <div className="points-chart" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              height={56}
              tick={(props) => <PersonTick {...props} items={items} />}
            />
            <YAxis axisLine={false} tickLine={false} width={40} tick={{ fill: "var(--muted)", fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: "color-mix(in srgb, var(--ink) 6%, transparent)" }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                color: "var(--ink)",
                fontSize: 13,
              }}
              formatter={(value) => [`${fmt(Number(value ?? 0))}${unit}`, metricName ?? "Points"]}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
              cursor="pointer"
              onClick={(_d, index) => {
                const href = items[index]?.href;
                if (href) {
                  startNav();
                  router.push(href);
                }
              }}
            >
              {items.map((i) => (
                <Cell
                  key={i.href}
                  fill={toneFill[i.tone]}
                  stroke={i.highlight ? "var(--ink)" : "transparent"}
                  strokeWidth={i.highlight ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Accordion>
  );
}
