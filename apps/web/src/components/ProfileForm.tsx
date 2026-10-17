"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";
import type { Profile } from "@/lib/types";

export default function ProfileForm({ profile }: { profile: Profile }) {
  const { error, busy, run } = useAction();
  const [name, setName] = useState(profile.name);
  const [title, setTitle] = useState(profile.job_title);
  const [bio, setBio] = useState(profile.bio);
  const [saved, setSaved] = useState(false);
  const dirty = name !== profile.name || title !== profile.job_title || bio !== profile.bio;

  return (
    <div className="two">
      <div className="panel stack">
        <div>
          <label htmlFor="p-name">Name</label>
          <input id="p-name" style={{ width: "100%" }} value={name} maxLength={80} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        </div>
        <div>
          <label htmlFor="p-title">Job title</label>
          <input id="p-title" style={{ width: "100%" }} value={title} maxLength={80} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} />
        </div>
        <div>
          <label htmlFor="p-bio">About you</label>
          <textarea id="p-bio" value={bio} maxLength={500} onChange={(e) => { setBio(e.target.value); setSaved(false); }} />
        </div>
        <div className="row">
          <button
            className="btn"
            disabled={!dirty || !name.trim() || busy}
            onClick={async () => {
              if (await run("PATCH", "/profile", { name, job_title: title, bio })) setSaved(true);
            }}
          >
            Save profile
          </button>
          {saved && <span role="status">Saved.</span>}
        </div>
        {error && <div className="msg error" role="alert">{error}</div>}
      </div>

      <div className="panel">
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 18px" }}>
          <dt className="muted">Google account</dt>
          <dd style={{ margin: 0 }}>{profile.email}</dd>
          <dt className="muted">Role</dt>
          <dd style={{ margin: 0 }}>{profile.role}</dd>
          <dt className="muted">Team</dt>
          <dd style={{ margin: 0 }}>{profile.team_name ?? "Not on a team yet"}</dd>
        </dl>
        <p className="muted" style={{ marginBottom: 0 }}>
          Your email, role and team are set by your Google account and an admin.
        </p>
      </div>
    </div>
  );
}
