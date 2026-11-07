"use client";

import { useMemo, useState } from "react";
import Avatar from "./Avatar";
import Dropdown from "./Dropdown";
import SiteLogo from "./SiteLogo";
import { useAction } from "@/lib/client";
import { BIDDER_LABEL, BIDDER_STATUSES, BIDDER_TONE, STATUS_LABEL, STATUS_TONE, STATUSES } from "@/lib/training";
import type { BidderStatus, ProfileAssignee, ProfilePerson, TeamProfile, TrainingSite, TrainingStatus, User } from "@/lib/types";



type View = "cards" | "list";

/* Format a phone number as it's typed, without ever rejecting what was typed:
   profiles hold international numbers and extensions, and a formatter that
   fights the typist is worse than none.

   A plain 10-digit US number (optionally with a leading 1) gets the familiar
   (555) 010-0100 grouping. Anything else — a leading +, a longer number, any
   other shape — is passed through untouched apart from collapsing runs of
   spaces, so existing values and non-US numbers keep working. */
export function formatPhone(raw: string): string {
  if (raw.trim().startsWith("+")) return raw.replace(/\s{2,}/g, " ");
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  // Only reformat once it can't be anything but a US-shaped number.
  if (local.length > 10) return raw.replace(/\s{2,}/g, " ");
  if (local.length > 6) return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  if (local.length > 3) return `(${local.slice(0, 3)}) ${local.slice(3)}`;
  if (local.length > 0 && /[()\- ]/.test(raw)) return `(${local}`;
  return raw;
}

const blank = {
  full_name: "",
  email: "",
  phone: "",
  linkedin_url: "",
  notes: "",
  assignee_ids: [] as number[],
  bidder_id: null as number | null,
  bidder_status: "none" as BidderStatus,
};

export default function ProfilesPanel({
  profiles,
  sites,
  people,
  me,
}: {
  profiles: TeamProfile[];
  sites: TrainingSite[];
  people: ProfilePerson[];
  me: User;
}) {
  const { error, busy, run, setError } = useAction();
  const [view, setView] = useState<View>("cards");
  const [query, setQuery] = useState("");
  /* 0 = everyone, -1 = unassigned only, otherwise a user id. Kept as a number
     so it can feed Dropdown<number> like the other pickers. */
  const [assignee, setAssignee] = useState<number>(0);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(blank);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if (assignee === -1 && p.assignees.length > 0) return false;
      if (assignee > 0 && !p.assignees.some((a) => a.user_id === assignee)) return false;
      if (!q) return true;
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.assignees.some((a) => a.name.toLowerCase().includes(q))
      );
    });
  }, [profiles, query, assignee]);

  /* Only people actually assigned to something are worth offering — a list of
     every user would mostly be options that match nothing. */
  const assigneeOptions = useMemo(() => {
    const seen = new Map<number, ProfileAssignee>();
    for (const p of profiles) for (const a of p.assignees) seen.set(a.user_id, a);
    return [...seen.values()].sort((x, y) => x.name.localeCompare(y.name));
  }, [profiles]);

  const openNew = () => {
    setError(null);
    setForm({ ...blank, assignee_ids: [me.id] });
    setEditing("new");
  };

  const openEdit = (p: TeamProfile) => {
    setError(null);
    setForm({
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      linkedin_url: p.linkedin_url,
      notes: p.notes,
      assignee_ids: p.assignees.map((a) => a.user_id),
      bidder_id: p.bidder_id,
      bidder_status: p.bidder_status,
    });
    setEditing(p.id);
  };

  const save = async () => {
    if (!form.full_name.trim()) {
      setError("A profile needs a name.");
      return;
    }
    const ok =
      editing === "new"
        ? await run("POST", "/profiles", form)
        : await run("PATCH", `/profiles/${editing}`, form);
    if (ok) setEditing(null);
  };

  const remove = async (p: TeamProfile) => {
    if (await run("DELETE", `/profiles/${p.id}`)) setEditing(null);
  };

  const toggleAssignee = (id: number) =>
    setForm((f) => ({
      ...f,
      assignee_ids: f.assignee_ids.includes(id)
        ? f.assignee_ids.filter((x) => x !== id)
        : [...f.assignee_ids, id],
    }));

  const addAssignee = (id: number) =>
    setForm((f) =>
      f.assignee_ids.includes(id) ? f : { ...f, assignee_ids: [...f.assignee_ids, id] },
    );

  // Only offer people who aren't assigned yet, so the list shrinks as you pick.
  const unassigned = people.filter((p) => !form.assignee_ids.includes(p.id));
  /* Any user can be named the bidder on a profile — it's a job on this profile,
     not a property of the account. Users flagged `is_bidder` on Admin › Users
     sort first, since they're the usual picks. */
  const bidders = [...people].sort(
    (a, b) => Number(b.is_bidder) - Number(a.is_bidder) || a.id - b.id,
  );

  const setAccount = (profileId: number, siteId: number, status: TrainingStatus) =>
    run("PUT", "/training-accounts", { profile_id: profileId, site_id: siteId, status });

  const removeAccount = (accountId: number) => run("DELETE", `/training-accounts/${accountId}`);

  return (
    <>
      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      <div className="profiles-bar">
        <div className="searchbar table-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.6-3.6" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search profiles"
            aria-label="Search profiles"
          />
        </div>
        <div className="profiles-assignee">
          <Dropdown<number>
            value={assignee}
            ariaLabel="Filter by assignee"
            onChange={setAssignee}
            options={[
              { value: 0, label: "All assignees" },
              { value: -1, label: "Unassigned" },
              ...assigneeOptions.map((a) => ({
                value: a.user_id,
                label: a.name,
                media: <Avatar name={a.name} email={a.email} src={a.avatar} size={20} />,
              })),
            ]}
          />
        </div>
        <div className="viewswitch" role="group" aria-label="View">
          <button
            type="button"
            className={view === "cards" ? "on" : ""}
            onClick={() => setView("cards")}
            aria-pressed={view === "cards"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
            </svg>
            Cards
          </button>
          <button
            type="button"
            className={view === "list" ? "on" : ""}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6.5h16M4 12h16M4 17.5h16" />
            </svg>
            List
          </button>
        </div>
        <button className="btn" type="button" onClick={openNew} disabled={busy}>
          New profile
        </button>
      </div>

      {editing !== null && (
        <div className="panel profile-editor">
          <h2 className="panel-title">{editing === "new" ? "New profile" : "Edit profile"}</h2>
          <div className="two">
            <div>
              <label htmlFor="pf-name">Full name</label>
              <input
                id="pf-name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label htmlFor="pf-email">Email</label>
              <input
                id="pf-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label htmlFor="pf-phone">Phone</label>
              <input
                id="pf-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="input-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                placeholder="(555) 010-0100"
              />
            </div>
            <div>
              <label htmlFor="pf-li">LinkedIn URL</label>
              <input
                id="pf-li"
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/jane"
              />
            </div>
          </div>

          <label htmlFor="pf-notes">Notes</label>
          <textarea
            id="pf-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Anything worth remembering about this profile."
          />

          {/* Assignee, bidder and bidder status line up in one row: they are
              the three "who is on this" choices. Pick an assignee from the
              dropdown, one at a time; chosen people show below as removable
              pills. A multiple-select hides the unpicked names behind a
              scroll and is awkward to deselect. */}
          <div className="people-row">
            <div>
              <label htmlFor="pf-assignee">Assigned to</label>
              <Dropdown<number>
                id="pf-assignee"
                value=""
                placeholder={unassigned.length === 0 ? "Everyone is assigned" : "Add someone…"}
                ariaLabel="Add an assignee"
                disabled={unassigned.length === 0}
                onChange={addAssignee}
                options={unassigned.map((p) => ({
                  value: p.id,
                  label: p.name || p.email,
                  hint: p.name ? p.email : undefined,
                  media: <Avatar name={p.name} email={p.email} src={p.avatar} size={22} />,
                }))}
              />
            </div>

            <div>
              <label htmlFor="pf-bidder">Bidder</label>
              <Dropdown<number>
                id="pf-bidder"
                value={form.bidder_id ?? 0}
                placeholder="No bidder"
                ariaLabel="Assign a bidder"
                onChange={(id) =>
                  setForm((f) => ({
                    ...f,
                    bidder_id: id === 0 ? null : id,
                    // Clearing the bidder clears the status with it; naming
                    // one starts the work off as assigned.
                    bidder_status:
                      id === 0 ? "none" : f.bidder_status === "none" ? "assigned" : f.bidder_status,
                  }))
                }
                options={[
                  { value: 0, label: "No bidder" },
                  ...bidders.map((p) => ({
                    value: p.id,
                    label: p.name || p.email,
                    // Flagged bidders are called out; anyone else is still pickable.
                    hint: p.is_bidder ? "Bidder" : p.name ? p.email : undefined,
                    media: <Avatar name={p.name} email={p.email} src={p.avatar} size={22} />,
                  })),
                ]}
              />
            </div>
            <div>
              <label htmlFor="pf-bidder-status">Bidder status</label>
              <Dropdown<BidderStatus>
                id="pf-bidder-status"
                value={form.bidder_status}
                tone={BIDDER_TONE[form.bidder_status]}
                ariaLabel="Bidder status"
                disabled={!form.bidder_id}
                onChange={(st) => setForm((f) => ({ ...f, bidder_status: st }))}
                options={BIDDER_STATUSES.map((st) => ({
                  value: st,
                  label: BIDDER_LABEL[st],
                  media: <span className={`dd-dot tone-${BIDDER_TONE[st]}`} />,
                }))}
              />
            </div>
          </div>

          {/* The chosen assignees, below the row so they can wrap freely. */}
          <div className="assignee-picker">
            {form.assignee_ids.length === 0 ? (
              <span className="muted small">Nobody yet</span>
            ) : (
              <div className="assignees">
                {form.assignee_ids.map((id) => {
                  const p = people.find((x) => x.id === id);
                  return (
                    <span className="chip removable" key={id}>
                      {p ? p.name || p.email : `User ${id}`}
                      <button
                        type="button"
                        onClick={() => toggleAssignee(id)}
                        aria-label={`Remove ${p ? p.name || p.email : `user ${id}`}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="row" style={{ marginTop: 14, gap: 8 }}>
            <button className="btn" type="button" onClick={save} disabled={busy}>
              {editing === "new" ? "Create profile" : "Save changes"}
            </button>
            <button className="btn secondary" type="button" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </button>
            {editing !== "new" && (
              <button
                className="btn danger"
                type="button"
                style={{ marginLeft: "auto" }}
                onClick={() => {
                  const p = profiles.find((x) => x.id === editing);
                  if (p) remove(p);
                }}
                disabled={busy}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="empty">
          {profiles.length === 0 ? "No profiles yet. Create one to get started." : "No profiles match that search."}
        </div>
      ) : view === "cards" ? (
        <div className="profile-grid">
          {shown.map((p) => (
            <article className="panel profile-card" key={p.id}>
              <header>
                <h3>{p.full_name}</h3>
                <button
                  className="icon-action"
                  type="button"
                  onClick={() => openEdit(p)}
                  disabled={busy}
                  aria-label={`Edit ${p.full_name}`}
                  title="Edit"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h8" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5l-4 1 1-4Z" />
                  </svg>
                </button>
              </header>
              <dl className="profile-fields">
                {p.email && (
                  <div>
                    <dt>Email</dt>
                    <dd>{p.email}</dd>
                  </div>
                )}
                {p.phone && (
                  <div>
                    <dt>Phone</dt>
                    <dd>{p.phone}</dd>
                  </div>
                )}
                {p.linkedin_url && (
                  <div>
                    <dt>LinkedIn</dt>
                    <dd>
                      <a href={p.linkedin_url} target="_blank" rel="noreferrer noopener">
                        Open profile
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              <div className="profile-assignees">
                {p.assignees.length === 0 ? (
                  <span className="muted">Unassigned</span>
                ) : (
                  p.assignees.map((a) => (
                    <span className="assignee" key={a.user_id} title={a.email}>
                      <Avatar name={a.name} email={a.email} src={a.avatar} size={22} />
                      {a.name}
                    </span>
                  ))
                )}
                <BidderTag profile={p} />
              </div>

              <AccountRow
                profile={p}
                sites={sites}
                busy={busy}
                onSet={setAccount}
                onRemove={removeAccount}
              />
            </article>
          ))}
        </div>
      ) : (
        <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
          <table className="profiles-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Assigned to</th>
                <th>AI training</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.full_name}</strong>
                    {p.linkedin_url && (
                      <>
                        <br />
                        <a className="muted small" href={p.linkedin_url} target="_blank" rel="noreferrer noopener">
                          LinkedIn
                        </a>
                      </>
                    )}
                  </td>
                  <td>
                    {p.email || <span className="muted">—</span>}
                    {p.phone && (
                      <>
                        <br />
                        <span className="muted small">{p.phone}</span>
                      </>
                    )}
                  </td>
                  <td>
                    {p.assignees.length === 0 ? (
                      <div className="profile-assignees">
                        <span className="muted">Unassigned</span>
                        <BidderTag profile={p} />
                      </div>
                    ) : (
                      <div className="profile-assignees">
                        {p.assignees.map((a) => (
                          <span className="assignee" key={a.user_id} title={a.email}>
                            <Avatar name={a.name} email={a.email} src={a.avatar} size={20} />
                            {a.name}
                          </span>
                        ))}
                        <BidderTag profile={p} />
                      </div>
                    )}
                  </td>
                  <td>
                    {p.accounts.length === 0 ? (
                      <span className="muted">None</span>
                    ) : (
                      <div className="chips">
                        {p.accounts.map((a) => (
                          <span className={`chip status-${STATUS_TONE[a.status]}`} key={a.id}>
                            {a.site_name}: {STATUS_LABEL[a.status]}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="icon-action"
                      type="button"
                      onClick={() => openEdit(p)}
                      disabled={busy}
                      aria-label={`Edit ${p.full_name}`}
                      title="Edit"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 20h8" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* Per-profile AI training accounts. Only sites this profile actually has an
   account on are listed — the rest sit behind "Add a site", so a profile with
   two accounts doesn't render a row for every site in the org. */
function AccountRow({
  profile,
  sites,
  busy,
  onSet,
  onRemove,
}: {
  profile: TeamProfile;
  sites: TrainingSite[];
  busy: boolean;
  onSet: (profileId: number, siteId: number, status: TrainingStatus) => void;
  onRemove: (accountId: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const byId = new Map(profile.accounts.map((a) => [a.site_id, a]));
  const available = sites.filter((s) => !byId.has(s.id));

  if (sites.length === 0) {
    return (
      <p className="muted small accounts-empty">
        No AI training sites yet. Add one on the AI Training page.
      </p>
    );
  }

  return (
    <div className="accounts">
      {/* No text for an empty list: the add button below says what to do.
          The rows scroll inside a capped box; the add button sits outside it
          so it stays reachable however many accounts a profile has. */}
      <div className="profile-accounts">
        {profile.accounts.map((a) => (
          <div className="account-row" key={a.id}>
            <span className="account-site" title={a.site_name}>
              {a.site_name}
            </span>
            <Dropdown<TrainingStatus>
              value={a.status}
              tone={STATUS_TONE[a.status]}
              ariaLabel={`${a.site_name} status for ${profile.full_name}`}
              disabled={busy}
              onChange={(st) => onSet(profile.id, a.site_id, st)}
              options={STATUSES.map((st) => ({
                value: st,
                label: STATUS_LABEL[st],
                media: <span className={`dd-dot tone-${STATUS_TONE[st]}`} />,
              }))}
            />
            <button
              type="button"
              className="account-remove"
              onClick={() => onRemove(a.id)}
              disabled={busy}
              aria-label={`Remove ${a.site_name} from ${profile.full_name}`}
              title="Remove this account"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="account-add">
          <Dropdown<number>
            value=""
            placeholder="Pick a site…"
            ariaLabel={`Add an AI training site for ${profile.full_name}`}
            disabled={busy}
            onChange={(siteId) => {
              // A new account starts at the first status; change it after.
              onSet(profile.id, siteId, STATUSES[0]);
              setAdding(false);
            }}
            options={available.map((s) => ({
              value: s.id,
              label: s.name,
              media: <SiteLogo name={s.name} iconUrl={s.icon_url} siteUrl={s.url} size={20} />,
            }))}
          />
          <button className="btn secondary small" type="button" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      ) : available.length > 0 ? (
        <button className="btn secondary small account-addbtn" type="button" onClick={() => setAdding(true)} disabled={busy}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add AI training site
        </button>
      ) : null}
    </div>
  );
}

/* The bidder assigned to a profile, with their status. Renders nothing when
   no bidder is set, so cards without one look as they did before. */
function BidderTag({ profile }: { profile: TeamProfile }) {
  if (!profile.bidder) return null;
  const tone = BIDDER_TONE[profile.bidder_status];
  return (
    <span className={`assignee bidder-tag status-${tone}`} title={`Bidder: ${profile.bidder.email}`}>
      <Avatar name={profile.bidder.name} email={profile.bidder.email} src={profile.bidder.avatar} size={20} />
      {profile.bidder.name}
      <span className="bidder-state">{BIDDER_LABEL[profile.bidder_status]}</span>
    </span>
  );
}
