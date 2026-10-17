"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";
import type { Metric, Team, User } from "@/lib/types";

const Err = ({ text }: { text: string | null }) =>
  text ? <div className="msg error" role="alert">{text}</div> : null;

function Row({ m, canEdit }: { m: Metric; canEdit: boolean }) {
  const { error, busy, run } = useAction();
  const [weight, setWeight] = useState(String(m.weight));
  const [target, setTarget] = useState(String(m.target));
  const [unit, setUnit] = useState(m.unit);
  const [active, setActive] = useState(m.active);
  const dirty = Number(weight) !== m.weight || Number(target) !== m.target || unit !== m.unit || active !== m.active;
  return (
    <tr>
      <td>
        {m.name}
        <div className="muted" style={{ fontSize: 13 }}>
          {m.formula_type === "ratio" ? "done ÷ target × weight" : "done × weight"} ·{" "}
          {m.team_id === null ? "all teams" : (m.team_name ?? "your team")}
        </div>
      </td>
      <td className="n">
        <input type="number" step="any" min={0} aria-label={`${m.name} weight`} value={weight} disabled={!canEdit} onChange={(e) => setWeight(e.target.value)} />
      </td>
      <td className="n">
        {m.formula_type === "ratio" ? (
          <input type="number" step="any" min={0} aria-label={`${m.name} weekly target`} value={target} disabled={!canEdit} onChange={(e) => setTarget(e.target.value)} />
        ) : (
          <span className="muted">–</span>
        )}
      </td>
      <td>
        <input type="text" aria-label={`${m.name} unit`} value={unit} maxLength={24} disabled={!canEdit} onChange={(e) => setUnit(e.target.value)} style={{ width: 90 }} />
      </td>
      <td>
        <input type="checkbox" aria-label={`${m.name} is active`} checked={active} disabled={!canEdit} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td>
        {canEdit && (
          <button
            className="btn secondary"
            disabled={!dirty || busy}
            onClick={() => run("PATCH", `/metrics/${m.id}`, { weight: Number(weight), target: Number(target), unit, active })}
          >
            Save
          </button>
        )}
        <Err text={error} />
      </td>
    </tr>
  );
}

export default function MetricsManager({ me, metrics, teams }: { me: User; metrics: Metric[]; teams: Team[] }) {
  const { error, busy, run } = useAction();
  const [f, setF] = useState({ name: "", formula_type: "ratio", weight: "20", target: "5", unit: "", team_id: "" });

  return (
    <div className="panel">
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th className="n">Weight</th>
              <th className="n">Weekly target</th>
              <th>Unit</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <Row key={`${m.id}-${m.weight}-${m.target}-${m.unit}-${m.active}`} m={m} canEdit={me.role === "admin"} />
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 24 }}>Add a metric</h2>
      <p className="sub" style={{ marginTop: -4 }}>
        Ratio: points = done ÷ weekly target (capped at 120%) × weight. Count: points = done × weight. Your team enters these numbers each day.
      </p>
      <div className="row">
        <div>
          <label htmlFor="m-name">Name</label>
          <input id="m-name" placeholder="Customer calls" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="m-type">Formula</label>
          <select id="m-type" value={f.formula_type} onChange={(e) => setF({ ...f, formula_type: e.target.value })}>
            <option value="ratio">Ratio (done ÷ target)</option>
            <option value="count">Count (done)</option>
          </select>
        </div>
        <div>
          <label htmlFor="m-weight">Weight</label>
          <input id="m-weight" type="number" step="any" min={0} value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} />
        </div>
        {f.formula_type === "ratio" && (
          <div>
            <label htmlFor="m-target">Weekly target</label>
            <input id="m-target" type="number" step="any" min={0} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />
          </div>
        )}
        <div>
          <label htmlFor="m-unit">Unit</label>
          <input id="m-unit" placeholder="calls" maxLength={24} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} style={{ width: 100 }} />
        </div>
        {me.role === "admin" && (
          <div>
            <label htmlFor="m-team">For</label>
            <select id="m-team" value={f.team_id} onChange={(e) => setF({ ...f, team_id: e.target.value })}>
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          className="btn"
          disabled={!f.name.trim() || busy}
          onClick={async () => {
            const ok = await run("POST", "/metrics", {
              name: f.name,
              formula_type: f.formula_type,
              weight: Number(f.weight),
              target: f.formula_type === "ratio" ? Number(f.target) : 0,
              unit: f.unit,
              ...(me.role === "admin" ? { team_id: f.team_id ? Number(f.team_id) : null } : {}),
            });
            if (ok) setF({ ...f, name: "", unit: "" });
          }}
        >
          Add metric
        </button>
      </div>
      <Err text={error} />
    </div>
  );
}
