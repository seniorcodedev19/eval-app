"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Metric, Period, Team, User } from "@/lib/types";

async function call(method: string, path: string, body?: unknown): Promise<string | null> {
  const res = await fetch(`/api/proxy${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.ok) return null;
  const j = await res.json().catch(() => ({}));
  return j.error ?? `Request failed (${res.status})`;
}

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const run = async (method: string, path: string, body?: unknown) => {
    setError(null);
    const err = await call(method, path, body);
    if (err) setError(err);
    else router.refresh();
    return !err;
  };
  return { error, run };
}

const Err = ({ text }: { text: string | null }) =>
  text ? (
    <div className="msg error" role="alert">
      {text}
    </div>
  ) : null;

function Users({ me, users, teams }: { me: User; users: User[]; teams: Team[] }) {
  const { error, run } = useAction();
  return (
    <section>
      <h2>People</h2>
      <p className="sub" style={{ marginTop: -4 }}>
        People appear here after their first sign-in. Assign a role and a team.
      </p>
      <div className="panel tablewrap">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Team</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={`${u.id}-${u.role}-${u.team_id}-${u.active}`}>
                <td>
                  {u.name || u.email}
                  <div className="muted" style={{ fontSize: 13 }}>
                    {u.email}
                  </div>
                </td>
                <td>
                  <select
                    aria-label={`Role for ${u.email}`}
                    defaultValue={u.role}
                    onChange={(e) => run("PATCH", `/users/${u.id}`, { role: e.target.value })}
                  >
                    <option value="member">member</option>
                    <option value="manager">manager</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <select
                    aria-label={`Team for ${u.email}`}
                    defaultValue={u.team_id ?? ""}
                    onChange={(e) => run("PATCH", `/users/${u.id}`, { team_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">No team</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${u.email} is active`}
                    defaultChecked={u.active}
                    disabled={u.id === me.id}
                    onChange={(e) => run("PATCH", `/users/${u.id}`, { active: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Err text={error} />
    </section>
  );
}

function Teams({ teams }: { teams: Team[] }) {
  const { error, run } = useAction();
  const [name, setName] = useState("");
  return (
    <section>
      <h2>Teams</h2>
      <div className="panel">
        <p style={{ margin: "0 0 12px" }}>{teams.length ? teams.map((t) => t.name).join(", ") : "No teams yet."}</p>
        <div className="row">
          <div>
            <label htmlFor="team-name">New team</label>
            <input id="team-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button
            className="btn"
            disabled={!name.trim()}
            onClick={async () => {
              if (await run("POST", "/teams", { name })) setName("");
            }}
          >
            Add team
          </button>
        </div>
        <Err text={error} />
      </div>
    </section>
  );
}

function MetricRow({ m }: { m: Metric }) {
  const { error, run } = useAction();
  const [weight, setWeight] = useState(String(m.weight));
  const [cap, setCap] = useState(String(m.cap));
  const [active, setActive] = useState(m.active);
  const dirty = Number(weight) !== m.weight || Number(cap) !== m.cap || active !== m.active;
  return (
    <tr>
      <td>
        {m.name}
        <div className="muted" style={{ fontSize: 13 }}>
          {m.key}
        </div>
      </td>
      <td>{m.formula_type === "ratio" ? "done ÷ planned" : "done count"}</td>
      <td className="n">
        <input type="number" step="any" min={0} aria-label={`${m.name} weight`} value={weight} onChange={(e) => setWeight(e.target.value)} />
      </td>
      <td className="n">
        {m.formula_type === "ratio" ? (
          <input type="number" step="any" min={0.1} aria-label={`${m.name} cap`} value={cap} onChange={(e) => setCap(e.target.value)} />
        ) : (
          <span className="muted">–</span>
        )}
      </td>
      <td>
        <input type="checkbox" aria-label={`${m.name} is active`} checked={active} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td>
        <button className="btn secondary" disabled={!dirty} onClick={() => run("PATCH", `/metrics/${m.id}`, { weight: Number(weight), cap: Number(cap), active })}>
          Save
        </button>
        <Err text={error} />
      </td>
    </tr>
  );
}

function Metrics({ metrics }: { metrics: Metric[] }) {
  const { error, run } = useAction();
  const [f, setF] = useState({ key: "", name: "", formula_type: "ratio", weight: "10" });
  return (
    <section>
      <h2>Metrics</h2>
      <p className="sub" style={{ marginTop: -4 }}>
        Ratio: done ÷ planned (capped) × weight. Count: done × weight. Weight changes apply to open periods; locked periods keep their stored scores.
      </p>
      <div className="panel tablewrap">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Formula</th>
              <th className="n">Weight</th>
              <th className="n">Cap</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <MetricRow key={`${m.id}-${m.weight}-${m.cap}-${m.active}`} m={m} />
            ))}
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 16 }}>
          <div>
            <label htmlFor="m-key">Key</label>
            <input id="m-key" placeholder="bugs_fixed" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} />
          </div>
          <div>
            <label htmlFor="m-name">Name</label>
            <input id="m-name" placeholder="Bugs fixed" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="m-type">Formula</label>
            <select id="m-type" value={f.formula_type} onChange={(e) => setF({ ...f, formula_type: e.target.value })}>
              <option value="ratio">Ratio (done ÷ planned)</option>
              <option value="count">Count (done)</option>
            </select>
          </div>
          <div>
            <label htmlFor="m-weight">Weight</label>
            <input id="m-weight" type="number" step="any" min={0} value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} />
          </div>
          <button
            className="btn"
            disabled={!f.key || !f.name}
            onClick={async () => {
              if (await run("POST", "/metrics", { key: f.key, name: f.name, formula_type: f.formula_type, weight: Number(f.weight) }))
                setF({ ...f, key: "", name: "" });
            }}
          >
            Add metric
          </button>
        </div>
        <Err text={error} />
      </div>
    </section>
  );
}

function Periods({ periods }: { periods: Period[] }) {
  const { error, run } = useAction();
  const [f, setF] = useState({ label: "", start_date: "", end_date: "" });
  return (
    <section>
      <h2>Review periods</h2>
      <p className="sub" style={{ marginTop: -4 }}>
        Locking a period stores each person's final score and stops further edits.
      </p>
      <div className="panel tablewrap">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Dates</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id}>
                <td>{p.label}</td>
                <td className="muted">
                  {p.start_date} to {p.end_date}
                </td>
                <td>{p.locked ? <span className="pill">locked</span> : <span className="pill">open</span>}</td>
                <td>
                  <button
                    className="btn secondary"
                    onClick={() => {
                      if (p.locked || window.confirm(`Lock ${p.label}? Scores will be frozen.`)) {
                        run("POST", `/periods/${p.id}/${p.locked ? "unlock" : "lock"}`, {});
                      }
                    }}
                  >
                    {p.locked ? "Unlock" : "Lock"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 16 }}>
          <div>
            <label htmlFor="p-label">Label</label>
            <input id="p-label" placeholder="2027-Q1" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          </div>
          <div>
            <label htmlFor="p-start">Start</label>
            <input id="p-start" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
          </div>
          <div>
            <label htmlFor="p-end">End</label>
            <input id="p-end" type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
          </div>
          <button
            className="btn"
            disabled={!f.label || !f.start_date || !f.end_date}
            onClick={async () => {
              if (await run("POST", "/periods", f)) setF({ label: "", start_date: "", end_date: "" });
            }}
          >
            Add period
          </button>
        </div>
        <Err text={error} />
      </div>
    </section>
  );
}

export default function AdminPanels(props: { me: User; users: User[]; teams: Team[]; metrics: Metric[]; periods: Period[] }) {
  return (
    <>
      <Users me={props.me} users={props.users} teams={props.teams} />
      <Teams teams={props.teams} />
      <Metrics metrics={props.metrics} />
      <Periods periods={props.periods} />
    </>
  );
}
