"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";
import type { Team, User } from "@/lib/types";

const Err = ({ text }: { text: string | null }) =>
  text ? <div className="msg error" role="alert">{text}</div> : null;

function UserRow({ me, u, teams }: { me: User; u: User; teams: Team[] }) {
  const { error, busy, run } = useAction();
  const [name, setName] = useState(u.name);
  const [title, setTitle] = useState(u.job_title ?? "");
  const dirty = name.trim() !== u.name || title !== (u.job_title ?? "");
  return (
    <tr>
      <td>
        <input aria-label={`Name for ${u.email}`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          {u.email}
        </div>
      </td>
      <td>
        <input aria-label={`Job title for ${u.email}`} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      </td>
      <td>
        <select aria-label={`Role for ${u.email}`} defaultValue={u.role} onChange={(e) => run("PATCH", `/users/${u.id}`, { role: e.target.value })}>
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
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <button
            className="btn secondary"
            type="button"
            disabled={!dirty || !name.trim() || busy}
            onClick={() => run("PATCH", `/users/${u.id}`, { name: name.trim(), job_title: title })}
          >
            Save
          </button>
          {u.id === me.id ? null : u.active ? (
            <button className="btn secondary" type="button" disabled={busy} onClick={() => run("PATCH", `/users/${u.id}`, { active: false })}>
              Deactivate
            </button>
          ) : (
            <button className="btn" type="button" disabled={busy} onClick={() => run("PATCH", `/users/${u.id}`, { active: true })}>
              Approve
            </button>
          )}
        </div>
        <Err text={error} />
      </td>
    </tr>
  );
}

function Users({ me, users, teams }: { me: User; users: User[]; teams: Team[] }) {
  return (
    <section>
      <h2>People</h2>
      <p className="sub" style={{ marginTop: -4 }}>
        Update name, title, role, and team. Email stays as their sign-in.
      </p>
      <div className="panel tablewrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Job title</th>
              <th>Role</th>
              <th>Team</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={`${u.id}-${u.name}-${u.email}-${u.job_title}-${u.role}-${u.team_id}-${u.active}`} me={me} u={u} teams={teams} />
            ))}
          </tbody>
        </table>
      </div>
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

export default function AdminPanels({ me, users, teams }: { me: User; users: User[]; teams: Team[] }) {
  return (
    <>
      <Users me={me} users={users} teams={teams} />
      <Teams teams={teams} />
    </>
  );
}
