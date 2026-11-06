import Link from "next/link";
import { STATUS_LABEL, STATUS_TONE, STATUSES } from "@/lib/training";
import type { TeamProfile, TrainingMatrix, TrainingStatus } from "@/lib/types";

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "accent" | "ok" | "warn" | "violet";
}) {
  return (
    <div className="tile">
      <span className={`tile-icon tone-${tone}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3.5 21 8l-9 4.5L3 8l9-4.5Z" />
          <path d="M6.5 10.2V15c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-4.8" />
        </svg>
      </span>
      <div className="tile-body">
        <span className="tile-label">{label}</span>
        <span className="tile-value">
          {value}
          {sub ? <span className="tile-sub">{sub}</span> : null}
        </span>
      </div>
    </div>
  );
}

/* Dashboard view of the profile/AI-training data: how many profiles exist,
   how many accounts are approved, and where the rest sit. */
export default function TrainingSummary({
  profiles,
  matrix,
}: {
  profiles: TeamProfile[];
  matrix: TrainingMatrix;
}) {
  const tally: Partial<Record<TrainingStatus, number>> = {};
  for (const a of matrix.accounts) tally[a.status] = (tally[a.status] ?? 0) + 1;

  const totalAccounts = matrix.accounts.length;
  const approved = tally.approved ?? 0;
  const approvalRate = totalAccounts > 0 ? Math.round((approved / totalAccounts) * 100) : null;
  const unassigned = profiles.filter((p) => p.assignees.length === 0).length;

  // Every possible (profile, site) pairing that has no account yet.
  const possible = matrix.profiles.length * matrix.sites.length;
  const notStarted = Math.max(0, possible - totalAccounts);

  if (profiles.length === 0 && matrix.sites.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title">Profiles &amp; AI training</h2>
        <div className="empty">
          Nothing yet. Create a profile on the <Link href="/profiles">Profiles</Link> page to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Profiles &amp; AI training</h2>
        <Link className="btn secondary small" href="/ai-training">
          Open AI Training
        </Link>
      </div>

      <div className="tiles" style={{ marginBottom: 12 }}>
        <Tile
          label="Profiles"
          value={String(profiles.length)}
          sub={unassigned > 0 ? `${unassigned} unassigned` : undefined}
          tone="accent"
        />
        <Tile label="Training sites" value={String(matrix.sites.length)} tone="violet" />
        <Tile
          label="Accounts"
          value={String(totalAccounts)}
          sub={notStarted > 0 ? `${notStarted} not started` : undefined}
          tone="warn"
        />
        <Tile
          label="Approved"
          value={approvalRate === null ? "—" : `${approvalRate}%`}
          sub={totalAccounts > 0 ? `${approved} of ${totalAccounts}` : undefined}
          tone="ok"
        />
      </div>

      {totalAccounts > 0 ? (
        <>
          {/* Share of accounts by status, as one stacked bar. */}
          <div className="statusbar" role="img" aria-label="Accounts by status">
            {STATUSES.filter((s) => tally[s]).map((s) => (
              <span
                key={s}
                className={`statusbar-seg tone-${STATUS_TONE[s]}`}
                style={{ width: `${((tally[s] ?? 0) / totalAccounts) * 100}%` }}
                title={`${STATUS_LABEL[s]}: ${tally[s]}`}
              />
            ))}
          </div>
          <div className="chips" style={{ marginTop: 10 }}>
            {STATUSES.filter((s) => tally[s]).map((s) => (
              <span className={`chip status-${STATUS_TONE[s]}`} key={s}>
                {STATUS_LABEL[s]} {tally[s]}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="empty">
          No AI training accounts yet. Add one from a profile on the{" "}
          <Link href="/profiles">Profiles</Link> page.
        </div>
      )}
    </div>
  );
}
