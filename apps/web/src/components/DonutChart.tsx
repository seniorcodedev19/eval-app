import { fmt } from "@/lib/format";

export interface Slice {
  label: string;
  value: number;
  /** series token index, 0-5 */
  tone: number;
}

const TAU = Math.PI * 2;

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  // full circle can't be drawn with a single arc; nudge it closed
  const end = to - from >= TAU ? to - 0.0001 : to;
  const x1 = cx + r * Math.cos(from);
  const y1 = cy + r * Math.sin(from);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = end - from > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/* Donut with a centred figure and a legend, as in the design.
   Drawn as stroked arcs so the ring thickness is a single value. */
export default function DonutChart({
  slices,
  centerValue,
  centerLabel,
  unit = "",
  legendUnit,
  label,
}: {
  slices: Slice[];
  centerValue: string;
  centerLabel?: string;
  unit?: string;
  legendUnit?: string;
  label: string;
}) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const size = 168;
  const r = 66;
  const c = size / 2;

  // Lay the arcs out in one pass, starting at 12 o'clock.
  const drawn: (Slice & { share: number; d: string | null })[] = [];
  slices.reduce((cursor, s) => {
    const share = total > 0 ? Math.max(0, s.value) / total : 0;
    const to = cursor + share * TAU;
    drawn.push({ ...s, share, d: share > 0 ? arc(c, c, r, cursor, to) : null });
    return to;
  }, -Math.PI / 2);

  return (
    <div className="donut">
      <div className="donut-figure">
        <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line)" strokeWidth="18" />
          {drawn.map((s) =>
            s.d ? (
              <path
                key={s.label}
                d={s.d}
                fill="none"
                stroke={`var(--s${s.tone})`}
                strokeWidth="18"
                strokeLinecap="butt"
              />
            ) : null,
          )}
        </svg>
        <div className="donut-center">
          <strong>{centerValue}</strong>
          {centerLabel ? <span>{centerLabel}</span> : null}
        </div>
      </div>

      <ul className="donut-legend">
        {drawn.map((s) => (
          <li key={s.label}>
            <span className="dot" style={{ background: `var(--s${s.tone})` }} />
            <span className="donut-legend-label">{s.label}</span>
            <span className="donut-legend-value">
              {fmt(s.value)}
              {legendUnit ?? unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
