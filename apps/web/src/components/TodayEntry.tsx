"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { call } from "@/lib/client";
import type { Metric } from "@/lib/types";

// Quick entry for today on the dashboard.
export default function TodayEntry({
  today,
  metrics,
  daily,
  editable,
}: {
  today: string;
  metrics: Metric[];
  daily: Record<number, Record<string, number>>;
  editable: boolean;
}) {
  const router = useRouter();
  const start = () => Object.fromEntries(metrics.map((m) => [m.id, daily[m.id]?.[today] === undefined ? "" : String(daily[m.id][today])]));
  const [vals, setVals] = useState<Record<number, string>>(start);
  const [saved, setSaved] = useState<Record<number, string>>(start);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (metrics.length === 0) return null;

  async function saveAll() {
    setBusy(true);
    setStatus(null);
    let n = 0;
    for (const m of metrics) {
      if (vals[m.id] === saved[m.id]) continue;
      const num = vals[m.id].trim() === "" ? null : Number(vals[m.id]);
      if (num !== null && (Number.isNaN(num) || num < 0)) {
        setStatus({ ok: false, text: `${m.name}: enter a number of 0 or more.` });
        setBusy(false);
        return;
      }
      const r = await call("PUT", "/daily", { metric_id: m.id, entry_date: today, value: num });
      if (!r.ok) {
        setStatus({ ok: false, text: `${m.name}: ${r.error}` });
        setBusy(false);
        return;
      }
      n++;
    }
    setSaved(vals);
    setBusy(false);
    setStatus({ ok: true, text: n ? "Saved." : "Nothing changed." });
    router.refresh();
  }

  return (
    <div className="panel">
      <div className="row">
        {metrics.map((m) => (
          <div key={m.id}>
            <label htmlFor={`today-${m.id}`}>
              {m.name} {m.unit && <span>({m.unit})</span>}
            </label>
            <input
              id={`today-${m.id}`}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={vals[m.id]}
              disabled={!editable}
              onChange={(e) => setVals((v) => ({ ...v, [m.id]: e.target.value }))}
            />
          </div>
        ))}
        <button className="btn" onClick={saveAll} disabled={!editable || busy}>
          {busy ? "Saving…" : "Save today"}
        </button>
      </div>
      {!editable && <div className="msg muted">This week is locked, so today can&apos;t be edited.</div>}
      <div className={`msg ${status && !status.ok ? "error" : ""}`} role="status" aria-live="polite">
        {status?.text}
      </div>
    </div>
  );
}
