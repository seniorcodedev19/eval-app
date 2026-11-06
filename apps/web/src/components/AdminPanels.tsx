"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";
import type { Team, User } from "@/lib/types";
import Avatar from "./Avatar";
import Dropdown from "./Dropdown";
import Switch from "./Switch";

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
        <div className="person" style={{ marginBottom: 8 }}>
          <Avatar name={name || u.name} email={u.email} src={u.avatar} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <input aria-label={`Name for ${u.email}`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {u.email}
            </div>
          </div>
        </div>
      </td>
      <td>
        <input aria-label={`Job title for ${u.email}`} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      </td>
      <td>
        <Dropdown<string>
          ariaLabel={`Role for ${u.email}`}
          value={u.role}
          onChange={(v) => run("PATCH", `/users/${u.id}`, { role: v })}
          options={[
            { value: "member", label: "member" },
            { value: "manager", label: "manager" },
            { value: "admin", label: "admin" },
          ]}
        />
      </td>
      <td>
        <Dropdown<string>
          ariaLabel={`Team for ${u.email}`}
          value={u.team_id == null ? "" : String(u.team_id)}
          onChange={(v) => run("PATCH", `/users/${u.id}`, { team_id: v ? Number(v) : null })}
          options={[
            { value: "", label: "No team" },
            ...teams.map((t) => ({ value: String(t.id), label: t.name })),
          ]}
        />
      </td>
      <td>
        {/* Bidders are assignable to profiles but left out of every weekly
            metrics view, so this is a switch rather than a role. */}
        <Switch
          label={`${u.email} is a bidder`}
          checked={Boolean(u.is_bidder)}
          disabled={busy}
          onChange={(next) => run("PATCH", `/users/${u.id}`, { is_bidder: next })}
        />
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
              <th>Bidder</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={`${u.id}-${u.name}-${u.email}-${u.job_title}-${u.role}-${u.team_id}-${u.active}-${u.is_bidder}`} me={me} u={u} teams={teams} />
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
