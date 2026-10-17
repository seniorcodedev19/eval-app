"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";
import type { Team, User } from "@/lib/types";

const Err = ({ text }: { text: string | null }) =>
  text ? <div className="msg error" role="alert">{text}</div> : null;

function Users({ me, users, teams }: { me: User; users: User[]; teams: Team[] }) {
  const { error, run } = useAction();
  return (
    <section>
      <h2>People</h2>
      <p className="sub" style={{ marginTop: -4 }}>
        People appear here after their first Google sign-in. Give each person a role and a team.
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

export default function AdminPanels({ me, users, teams }: { me: User; users: User[]; teams: Team[] }) {
  return (
    <>
      <Users me={me} users={users} teams={teams} />
      <Teams teams={teams} />
    </>
  );
}
