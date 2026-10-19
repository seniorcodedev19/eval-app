"use client";

import Link from "next/link";
import { fmt } from "@/lib/format";
import Avatar from "./Avatar";

export interface Col {
  label: string;
  value: number;
  highlight?: boolean;
  tone?: "ok" | "wait" | "muted";
  href?: string;
  name?: string;
  email?: string;
  avatar?: string | null;
}

// Simple vertical bar chart. Bars scale to the largest value.
export default function ColumnChart({
  items,
  unit = "",
  label,
  className = "",
}: {
  items: Col[];
  unit?: string;
  label: string;
  className?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 0.0001);
  return (
    <div className={`trend${className ? ` ${className}` : ""}`} role="group" aria-label={label}>
      {items.map((i, idx) => {
        const height = `${Math.max((i.value / max) * 100, 2)}%`;
        const inner = (
          <>
            <small>
              {fmt(i.value)}
              {unit}
            </small>
            <div className="b" style={{ height }} />
            {(i.email || i.avatar) && (
              <Avatar name={i.name || i.label} email={i.email || i.label} src={i.avatar} size={28} />
            )}
            <small>{i.label}</small>
          </>
        );
        return (
          <div
            className={`col${i.highlight ? " hl" : ""}${i.value === 0 ? " zero" : ""}${i.tone ? ` tone-${i.tone}` : ""}`}
            key={`${i.label}-${idx}`}
          >
            {i.href ? (
              <Link href={i.href} className="col-hit" aria-label={`${i.label}: ${fmt(i.value)}${unit}`}>
                {inner}
              </Link>
            ) : (
              inner
            )}
          </div>
        );
      })}
    </div>
  );
}
