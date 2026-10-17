import { shortDay } from "@/lib/dates";
import { fmt } from "@/lib/format";

export interface LineSeries {
  id: number;
  name: string;
  values: number[];
}

const palette = ["var(--s0)", "var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];

function smoothPath(
  pts: { x: number; y: number }[],
  yMin: number,
  yMax: number,
): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const clamp = (y: number) => Math.max(yMin, Math.min(yMax, y));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function LineChart({
  days,
  series,
  meId,
  label,
}: {
  days: string[];
  series: LineSeries[];
  meId?: number;
  label: string;
}) {
  const W = 800;
  const H = 280;
  const pad = { l: 44, r: 16, t: 18, b: 36 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const xCount = Math.max(days.length - 1, 1);
  const x = (i: number) => pad.l + (i / xCount) * innerW;
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const baseline = y(0);

  return (
    <div>
      <svg className="linechart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="linechart-grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="linechart-label">
              {fmt(t)}
            </text>
          </g>
        ))}
        {days.map((d, i) => (
          <text key={d} x={x(i)} y={H - 10} textAnchor="middle" className="linechart-label">
            {shortDay(d)}
          </text>
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => ({ x: x(i), y: y(v) }));
          const line = smoothPath(pts, pad.t, pad.t + innerH);
          const area = `${line} L ${pts[pts.length - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`;
          const color = palette[si % palette.length];
          const mine = s.id === meId;
          return (
            <g key={s.id}>
              <path d={area} fill={color} className="linechart-fill" />
              <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth={mine ? 3.2 : 2.2}
                className="linechart-line"
              />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={mine ? 4 : 3.2} fill={color} className="linechart-dot">
                  <title>{`${s.name}: ${fmt(v)} on ${shortDay(days[i])}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <ul className="linechart-legend">
        {series.map((s, si) => (
          <li key={s.id}>
            <span className="swatch" style={{ background: palette[si % palette.length] }} />
            {s.name}
            {s.id === meId ? " (you)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
