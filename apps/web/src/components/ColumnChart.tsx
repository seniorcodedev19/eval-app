import { fmt } from "@/lib/format";

export interface Col {
  label: string;
  value: number;
  highlight?: boolean;
  tone?: "ok" | "wait" | "muted";
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
    <div className={`trend${className ? ` ${className}` : ""}`} role="img" aria-label={label}>
      {items.map((i, idx) => (
        <div
          className={`col${i.highlight ? " hl" : ""}${i.value === 0 ? " zero" : ""}${i.tone ? ` tone-${i.tone}` : ""}`}
          key={`${i.label}-${idx}`}
        >
          <small>
            {fmt(i.value)}
            {unit}
          </small>
          <div className="b" style={{ height: `${Math.max((i.value / max) * 100, 2)}%` }} />
          <small>{i.label}</small>
        </div>
      ))}
    </div>
  );
}
