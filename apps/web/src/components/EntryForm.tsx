"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Entry, Metric } from "@/lib/types";

interface Row {
  planned: string;
  done: string;
  bonus: string;
  note: string;
}

const str = (n: number | undefined) => (n === undefined ? "" : String(n));

export default function EntryForm({
  userId,
  periodId,
  locked,
  metrics,
  entries,
}: {
  userId: number;
  periodId: number;
  locked: boolean;
  metrics: Metric[];
  entries: Entry[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<number, Row>>(() =>
    Object.fromEntries(
      metrics.map((m) => {
        const e = entries.find((x) => x.metric_id === m.id);
        return [m.id, { planned: str(e?.planned), done: str(e?.done), bonus: str(e?.bonus), note: e?.note ?? "" }];
      }),
    ),
  );
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (id: number, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  async function save() {
    setSaving(true);
    setStatus(null);
    let saved = 0;
    for (const m of metrics) {
      const r = rows[m.id];
      const touched = r.planned !== "" || r.done !== "" || r.bonus !== "" || r.note !== "";
      if (!touched) continue;
      const res = await fetch("/api/proxy/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          period_id: periodId,
          metric_id: m.id,
          planned: Number(r.planned || 0),
          done: Number(r.done || 0),
          bonus: Number(r.bonus || 0),
          note: r.note || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setStatus({ kind: "error", text: `${m.name}: ${j.error ?? "couldn't save"}` });
        setSaving(false);
        return;
      }
      saved++;
    }
    setSaving(false);
    setStatus({ kind: "ok", text: saved ? `Saved ${saved} ${saved === 1 ? "metric" : "metrics"}.` : "Nothing to save." });
    router.refresh();
  }

  return (
    <div className="panel">
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th className="n">Planned</th>
              <th className="n">Done</th>
              <th className="n">Bonus</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.name}
                  <div className="muted" style={{ fontSize: 13 }}>
                    {m.formula_type === "ratio" ? `done ÷ planned × ${m.weight}` : `done × ${m.weight}`}
                  </div>
                </td>
                <td className="n">
                  {m.formula_type === "ratio" ? (
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label={`${m.name} planned`}
                      value={rows[m.id].planned}
                      disabled={locked}
                      onChange={(e) => set(m.id, { planned: e.target.value })}
                    />
                  ) : (
                    <span className="muted">–</span>
                  )}
                </td>
                <td className="n">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    aria-label={`${m.name} done`}
                    value={rows[m.id].done}
                    disabled={locked}
                    onChange={(e) => set(m.id, { done: e.target.value })}
                  />
                </td>
                <td className="n">
                  <input
                    type="number"
                    step="any"
                    aria-label={`${m.name} bonus`}
                    value={rows[m.id].bonus}
                    disabled={locked}
                    onChange={(e) => set(m.id, { bonus: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    maxLength={500}
                    aria-label={`${m.name} note`}
                    value={rows[m.id].note}
                    disabled={locked}
                    onChange={(e) => set(m.id, { note: e.target.value })}
                    style={{ width: "100%", minWidth: 140 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" onClick={save} disabled={locked || saving}>
          {saving ? "Saving…" : "Save results"}
        </button>
      </div>
      <div className={`msg ${status?.kind === "error" ? "error" : ""}`} role="status" aria-live="polite">
        {status?.text}
      </div>
    </div>
  );
}
