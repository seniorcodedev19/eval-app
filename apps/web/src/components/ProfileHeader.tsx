import Avatar from "./Avatar";
import { fmt } from "@/lib/format";
import type { HistoryPoint, Profile } from "@/lib/types";

function SummaryIcon({ name }: { name: "report" | "approved" | "points" }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (name === "approved") {
    return (
      <svg {...common}>
        <path d="M20 6.5 9.5 17 4 11.5" />
      </svg>
    );
  }
  if (name === "points") {
    return (
      <svg {...common}>
        <path d="M5 19V11M10 19V5M15 19v-5M20 19v-9" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="4.5" y="3.5" width="15" height="17" rx="3" />
      <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
    </svg>
  );
}

/* Profile header: avatar, name, role, and a summary of real activity. */
export default function ProfileHeader({
  profile,
  history,
}: {
  profile: Profile;
  history: HistoryPoint[] | null;
}) {
  const weeks = history?.length ?? 0;
  const approved = history?.filter((h) => h.status === "approved").length ?? 0;
  const points = history ? Math.round(history.reduce((s, h) => s + (h.total ?? 0), 0) * 10) / 10 : 0;

  const summary = [
    { label: "Weeks reported", value: fmt(weeks), icon: "report" as const, tone: "accent" },
    { label: "Weeks approved", value: fmt(approved), icon: "approved" as const, tone: "ok" },
    { label: "Points earned", value: fmt(points), icon: "points" as const, tone: "violet" },
  ];

  return (
    <div className="panel profile-head">
      <div className="profile-id">
        <Avatar name={profile.name} email={profile.email} src={profile.avatar} size={76} />
        <div className="profile-id-text">
          <h2>{profile.name || profile.email}</h2>
          <p className="profile-role">{profile.job_title || profile.role}</p>
          <p className="profile-meta">
            {profile.team_name ? <span className="pill">{profile.team_name}</span> : null}
            <span className="pill">{profile.role}</span>
          </p>
        </div>
      </div>

      <div className="profile-summary">
        <h3>Activity summary</h3>
        <ul>
          {summary.map((s) => (
            <li key={s.label}>
              <span className={`tile-icon tone-${s.tone}`}>
                <SummaryIcon name={s.icon} />
              </span>
              <span className="profile-summary-label">{s.label}</span>
              <strong>{s.value}</strong>
            </li>
          ))}
        </ul>
        {weeks === 0 ? <p className="muted profile-summary-note">Last 8 weeks. Nothing logged yet.</p> : null}
      </div>
    </div>
  );
}
