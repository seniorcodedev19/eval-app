import Link from "next/link";
import { redirect } from "next/navigation";
import AdminPanels from "@/components/AdminPanels";
import MetricsManager from "@/components/MetricsManager";
import { apiFetch } from "@/lib/api";
import type { AuditPage, Metric, Team, User } from "@/lib/types";

const PAGE_SIZE = 20;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const me = await apiFetch<User>("/me");
  if (me.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [users, teams, metrics, audit] = await Promise.all([
    apiFetch<User[]>("/users"),
    apiFetch<Team[]>("/teams"),
    apiFetch<Metric[]>("/metrics"),
    apiFetch<AuditPage>(`/audit?limit=${PAGE_SIZE}&offset=${offset}`),
  ]);

  const pages = Math.max(1, Math.ceil(audit.total / audit.limit));
  const current = Math.min(page, pages);

  return (
    <>
      <h1>Admin</h1>
      <p className="sub">People, teams, and metrics.</p>

      <AdminPanels me={me} users={users} teams={teams} />

      <h2>Metrics</h2>
      <p className="sub" style={{ marginTop: -4 }}>
        Weight and target changes apply to weeks that aren&apos;t approved yet.
      </p>
      <MetricsManager me={me} metrics={metrics} teams={teams} />

      <div className="head" style={{ marginTop: 32 }}>
        <h2 style={{ margin: 0 }}>Recent changes</h2>
        {audit.total > 0 && (
          <div className="row" style={{ alignItems: "center" }}>
            <Link
              className="btn secondary"
              href={current <= 2 ? "/admin" : `/admin?page=${current - 1}`}
              aria-label="Previous page"
              aria-disabled={current <= 1}
              style={current <= 1 ? { pointerEvents: "none", opacity: 0.4 } : undefined}
            >
              ←
            </Link>
            <span className="muted">
              {audit.offset + 1}–{Math.min(audit.offset + audit.rows.length, audit.total)} of {audit.total}
            </span>
            <Link
              className="btn secondary"
              href={`/admin?page=${current + 1}`}
              aria-label="Next page"
              aria-disabled={current >= pages}
              style={current >= pages ? { pointerEvents: "none", opacity: 0.4 } : undefined}
            >
              →
            </Link>
          </div>
        )}
      </div>
      <div className="panel tablewrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>What</th>
            </tr>
          </thead>
          <tbody>
            {audit.rows.map((a) => (
              <tr key={a.id}>
                <td className="muted">{new Date(a.at).toLocaleString("en-US")}</td>
                <td>{a.actor ?? "unknown"}</td>
                <td>
                  {a.action} {a.entity} {a.entity_id}
                </td>
              </tr>
            ))}
            {audit.rows.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  Nothing yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
