"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { call, useAction } from "@/lib/client";
import { addDays, dayMonth, shortDay } from "@/lib/dates";
import { fmt } from "@/lib/format";
import type { WeekData } from "@/lib/types";

const k = (metricId: number, day: string) => `${metricId}|${day}`;

// Daily input for the whole week. Each cell saves when you leave it.
export default function WeekGrid({ data }: { data: WeekData }) {
  const router = useRouter();
  const initial = () => {
    const o: Record<string, string> = {};
    for (const m of data.metrics)
      for (const d of data.days) {
        const v = data.daily[m.id]?.[d];
        o[k(m.id, d)] = v === undefined ? "" : String(v);
      }
    return o;
  };
  const [vals, setVals] = useState(initial);
  const saved = useRef<Record<string, string>>(initial());
  const [msg, setMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState(data.report?.summary ?? "");
  const submit = useAction();

  const lastDay = addDays(data.today, 1);

  async function save(metricId: number, day: string) {
    const key = k(metricId, day);
    if (vals[key] === saved.current[key]) return;
    const n = vals[key].trim() === "" ? null : Number(vals[key]);
    if (n !== null && (Number.isNaN(n) || n < 0)) {
      setMsg("Enter a number of 0 or more.");
      return;
    }
    const r = await call("PUT", "/daily", { metric_id: metricId, entry_date: day, value: n });
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    saved.current[key] = vals[key];
    setMsg(null);
    router.refresh();
  }

  if (data.metrics.length === 0) {
    return (
      <div className="panel empty">
        <strong>No metrics to report on yet.</strong>
        <div>Your manager adds them on this page. If you aren&apos;t on a team yet, ask an admin to add you.</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="tablewrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Metric</th>
              {data.days.map((d) => (
                <th key={d} className={`n${d === data.today ? " today" : ""}`}>
                  {shortDay(d)}
                  <small>{dayMonth(d)}</small>
                </th>
              ))}
              <th className="n">Total</th>
              <th className="n">Target</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((m) => {
              const total = data.days.reduce((s, d) => s + (Number(vals[k(m.id, d)]) || 0), 0);
              return (
                <tr key={m.id}>
                  <td>
                    {m.name}
                    <div className="muted" style={{ fontSize: 13 }}>
                      {m.unit || "units"}
                    </div>
                  </td>
                  {data.days.map((d) => (
                    <td key={d} className={`n${d === data.today ? " today" : ""}`}>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        aria-label={`${m.name}, ${shortDay(d)} ${dayMonth(d)}`}
                        value={vals[k(m.id, d)]}
                        disabled={!data.editable || d > lastDay}
                        onChange={(e) => setVals((v) => ({ ...v, [k(m.id, d)]: e.target.value }))}
                        onBlur={() => save(m.id, d)}
                      />
                    </td>
                  ))}
                  <td className="n">
                    <strong>{fmt(total)}</strong>
                  </td>
                  <td className="n muted">{m.formula_type === "ratio" ? fmt(m.target) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="msg error" role="alert">
        {msg}
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        {data.status === "returned" && data.report?.review_comment && (
          <div className="banner note">
            <strong>Your manager returned this week:</strong> {data.report.review_comment}
          </div>
        )}
        {data.status === "submitted" && (
          <div className="banner note">Submitted. Waiting for your manager to review it.</div>
        )}
        {data.status === "approved" && (
          <div className="banner note">
            Approved{data.report?.review_comment ? `: ${data.report.review_comment}.` : "."} Entries are locked.
          </div>
        )}
        {data.editable && (
          <>
            <div>
              <label htmlFor="summary">Notes for your manager (optional)</label>
              <textarea id="summary" maxLength={2000} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div className="row">
              <button
                className="btn"
                disabled={submit.busy}
                onClick={() => {
                  if (window.confirm("Submit this week for review? You won't be able to edit it unless it's returned.")) {
                    submit.run("POST", "/report/submit", { week_start: data.week_start, summary });
                  }
                }}
              >
                {data.status === "returned" ? "Resubmit week" : "Submit week for review"}
              </button>
              <span className="muted">Best done at the weekend, once your numbers are in.</span>
            </div>
            {submit.error && <div className="msg error" role="alert">{submit.error}</div>}
          </>
        )}
      </div>
    </div>
  );
}
