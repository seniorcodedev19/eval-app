"use client";

import Link from "next/link";
import { useState } from "react";
import { useAction } from "@/lib/client";
import { fmt } from "@/lib/format";
import { isTimeTracking, type Metric, type WeekData } from "@/lib/types";

function weekTotal(data: WeekData, m: Metric) {
  if (isTimeTracking(m)) return data.time_hours ?? 0;
  return Object.values(data.daily[m.id] ?? {}).reduce((s, v) => s + Number(v), 0);
}

// One weekly value per metric. Time Tracking hours come from the Time page.
export default function WeekGrid({ data }: { data: WeekData }) {
  const save = useAction();
  const submit = useAction();
  const [vals, setVals] = useState<Record<number, string>>(() =>
    Object.fromEntries(data.metrics.filter((m) => !isTimeTracking(m)).map((m) => [m.id, String(weekTotal(data, m) || "")])),
  );
  const [summary, setSummary] = useState(data.report?.summary ?? "");

  if (data.metrics.length === 0) {
    return (
      <div className="panel empty">
        <strong>No metrics to report on yet.</strong>
        <div>Your manager adds them on this page. If you aren&apos;t on a team yet, ask an admin to add you.</div>
      </div>
    );
  }

  const entries = data.metrics
    .filter((m) => !isTimeTracking(m))
    .map((m) => {
      const raw = vals[m.id]?.trim() ?? "";
      return { metric_id: m.id, value: raw === "" ? null : Number(raw) };
    });
  const invalid = entries.some((e) => e.value !== null && (Number.isNaN(e.value) || e.value < 0));

  async function saveNumbers() {
    if (invalid) {
      save.setError("Enter a number of 0 or more for each metric.");
      return false;
    }
    return save.run("PUT", "/weekly", { week_start: data.week_start, entries });
  }

  return (
    <div className="panel">
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ padding: 0, marginBottom: 12, fontWeight: 600 }}>This week&apos;s results</legend>
        <div className="stack">
          {data.metrics.map((m) => {
            const tracking = isTimeTracking(m);
            const done = tracking ? data.time_hours ?? 0 : Number(vals[m.id]) || 0;
            return (
              <div className="row" key={m.id} style={{ alignItems: "end" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label htmlFor={tracking ? undefined : `m-${m.id}`}>{m.name}</label>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {tracking
                      ? `Logged on Time tracking · target ${fmt(m.target)} ${m.unit || "hours"}`
                      : m.formula_type === "overtime"
                        ? `Weekly total · target ${fmt(m.target)} ${m.unit || "units"} · extra × overtime bonus`
                        : m.formula_type === "ratio"
                          ? `Weekly total · target ${fmt(m.target)} ${m.unit || "units"}`
                          : `Weekly total · ${m.unit || "units"}`}
                  </div>
                </div>
                {tracking ? (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{fmt(done)}</div>
                    {data.editable && (
                      <div>
                        <Link href="/time">Log time</Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      id={`m-${m.id}`}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={vals[m.id] ?? ""}
                      disabled={!data.editable}
                      onChange={(e) => setVals((v) => ({ ...v, [m.id]: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

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
              <button className="btn secondary" disabled={save.busy || invalid} onClick={() => saveNumbers()}>
                Save
              </button>
              <button
                className="btn"
                disabled={submit.busy || save.busy}
                onClick={async () => {
                  if (!window.confirm("Submit this week for review? You won't be able to edit it unless it's returned.")) return;
                  if (!(await saveNumbers())) return;
                  submit.run("POST", "/report/submit", { week_start: data.week_start, summary });
                }}
              >
                {data.status === "returned" ? "Resubmit week" : "Submit week for review"}
              </button>
            </div>
            {(save.error || submit.error) && (
              <div className="msg error" role="alert">
                {save.error || submit.error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
