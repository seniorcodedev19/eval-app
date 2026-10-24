"use client";

import { useMemo, useState } from "react";
import ApproveWeekButton from "@/components/ApproveWeekButton";
import PersonCell from "@/components/PersonCell";
import ReportStatusControl from "@/components/ReportStatusControl";
import { fmt } from "@/lib/format";
import type { Status, TeamWeekRow, User } from "@/lib/types";

const statusOrder: Record<Status, number> = { submitted: 0, returned: 1, draft: 2, approved: 3 };

type SortKey = "name" | "status" | "total" | `metric:${number}`;

function columns(rows: TeamWeekRow[], metrics?: { id: number; name: string }[]) {
  const map = new Map<number, string>();
  for (const m of metrics ?? []) map.set(m.id, m.name);
  for (const r of rows) for (const m of r.metric_points ?? []) if (!map.has(m.id)) map.set(m.id, m.name);
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

function metricDone(r: TeamWeekRow, metricId: number) {
  if (!r.has_data) return null;
  const cell = r.metric_points?.find((m) => m.id === metricId);
  return cell ? (cell.done ?? 0) : null;
}

function cmp(a: number | null, b: number | null, dir: number) {
  const av = a === null ? -1 : a;
  const bv = b === null ? -1 : b;
  return (av - bv) * dir;
}

function SortTh({
  label,
  sortKey,
  current,
  dir,
  align = "left",
  className = "",
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: number;
  align?: "left" | "right";
  className?: string;
  onSort: (key: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th className={`${align === "right" ? "n " : ""}${className}`.trim()}>
      <button type="button" className={`sort-th${active ? " on" : ""}`} onClick={() => onSort(sortKey)}>
        {label}
        <span className="sort-mark" aria-hidden>
          {active ? (dir > 0 ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

export default function TeamWeekTable({
  me,
  weekStart,
  rows,
  metrics,
}: {
  me: User;
  weekStart: string;
  rows: TeamWeekRow[];
  metrics?: { id: number; name: string }[];
}) {
  const people = useMemo(() => rows.filter((r) => r.role !== "admin"), [rows]);
  const cols = columns(people, metrics);
  const canApprove = me.role !== "member";
  const [sort, setSort] = useState<SortKey>("total");
  const [dir, setDir] = useState(-1);

  const onSort = (key: SortKey) => {
    if (key === sort) setDir((d) => -d);
    else {
      setSort(key);
      setDir(key === "name" || key === "status" ? 1 : -1);
    }
  };

  const sorted = useMemo(() => {
    const metricId = sort.startsWith("metric:") ? Number(sort.slice(7)) : null;
    return [...people].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name) * dir || a.email.localeCompare(b.email);
      if (sort === "status") return (statusOrder[a.status] - statusOrder[b.status]) * dir || a.name.localeCompare(b.name);
      if (metricId !== null) return cmp(metricDone(a, metricId), metricDone(b, metricId), dir) || a.name.localeCompare(b.name);
      return cmp(a.has_data ? a.total : null, b.has_data ? b.total : null, dir) || a.name.localeCompare(b.name);
    });
  }, [people, sort, dir]);

  if (people.length === 0) return <div className="empty">No people to show yet this week.</div>;

  return (
    <div className="tablewrap">
      <table className="matrix">
        <thead>
          <tr>
            <SortTh label="Person" sortKey="name" current={sort} dir={dir} onSort={onSort} className="person-col" />
            <SortTh label="Status" sortKey="status" current={sort} dir={dir} onSort={onSort} />
            {cols.map((m) => (
              <SortTh
                key={m.id}
                label={m.name}
                sortKey={`metric:${m.id}`}
                current={sort}
                dir={dir}
                align="right"
                className="metric"
                onSort={onSort}
              />
            ))}
            <SortTh label="Total" sortKey="total" current={sort} dir={dir} align="right" onSort={onSort} />
            {canApprove ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const byId = new Map((r.metric_points ?? []).map((m) => [m.id, m]));
            return (
              <tr key={r.user_id} className={r.user_id === me.id ? "me" : undefined}>
                <td className="person-col">
                  <PersonCell
                    name={r.name}
                    email={r.email}
                    avatar={r.avatar}
                    href={`/team/${r.user_id}?week=${weekStart}`}
                    size={28}
                  />
                </td>
                <td>
                  <ReportStatusControl
                    userId={r.user_id}
                    weekStart={weekStart}
                    status={r.status}
                    canEdit={me.role === "admin"}
                  />
                </td>
                {cols.map((m) => {
                  const cell = r.has_data ? byId.get(m.id) : undefined;
                  return (
                    <td key={m.id} className={`n${cell ? "" : " muted"}`}>
                      {cell ? fmt(cell.done ?? 0) : "–"}
                    </td>
                  );
                })}
                <td className="n">{r.has_data ? <strong>{fmt(r.total)}</strong> : <span className="muted">–</span>}</td>
                {canApprove ? (
                  <td>
                    {r.status === "submitted" && r.report_id && r.user_id !== me.id ? (
                      <ApproveWeekButton reportId={r.report_id} withComment={false} />
                    ) : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
