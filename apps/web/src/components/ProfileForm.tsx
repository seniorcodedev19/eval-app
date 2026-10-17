"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 192;
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image."));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const { error, busy, run, setError } = useAction();
  const [name, setName] = useState(profile.name);
  const [title, setTitle] = useState(profile.job_title);
  const [bio, setBio] = useState(profile.bio);
  const [saved, setSaved] = useState(false);
  const dirty = name !== profile.name || title !== profile.job_title || bio !== profile.bio;

  return (
    <div className="two">
      <div className="panel stack">
        <div className="row" style={{ alignItems: "center", gap: 16 }}>
          <Avatar name={name || profile.name} email={profile.email} src={profile.avatar} size={72} />
          <div>
            <label htmlFor="p-photo">Photo</label>
            <div className="row">
              <input
                id="p-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > 8 * 1024 * 1024) {
                    setError("Choose a photo smaller than 8 MB.");
                    return;
                  }
                  try {
                    const image = await resizePhoto(file);
                    await run("PUT", "/profile/avatar", { image });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not read that image.");
                  }
                }}
              />
              {profile.avatar && (
                <button className="btn secondary" type="button" disabled={busy} onClick={() => run("DELETE", "/profile/avatar", {})}>
                  Remove
                </button>
              )}
            </div>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Square crop, saved at 192px. If you skip this, your initial is used instead.
            </p>
          </div>
        </div>
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
