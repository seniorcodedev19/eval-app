import { redirect } from "next/navigation";
import AdminPanels from "@/components/AdminPanels";
import MetricsManager from "@/components/MetricsManager";
import ReviewQueue from "@/components/ReviewQueue";
import { apiFetch, tryFetch } from "@/lib/api";
import type { AuditRow, Metric, QueueItem, Team, User } from "@/lib/types";

export default async function AdminPage() {
  const me = await apiFetch<User>("/me");
  if (me.role !== "admin") redirect("/dashboard");

  const [users, teams, metrics, queue, audit] = await Promise.all([
    apiFetch<User[]>("/users"),
    apiFetch<Team[]>("/teams"),
    apiFetch<Metric[]>("/metrics"),
    tryFetch<QueueItem[]>("/review-queue"),
    apiFetch<AuditRow[]>("/audit?limit=30"),
  ]);

  return (
    <>
      <h1>Admin</h1>
      <p className="sub">People, teams, metrics, and weekly reviews.</p>

      <h2>Waiting for review</h2>
      {queue.ok ? <ReviewQueue items={queue.data} /> : <div className="banner error">{queue.error}</div>}

      <AdminPanels me={me} users={users} teams={teams} />

      <h2>Metrics</h2>
      <p className="sub" style={{ marginTop: -4 }}>
        Weight and target changes apply to weeks that aren&apos;t approved yet.
      </p>
      <MetricsManager me={me} metrics={metrics} teams={teams} />

      <h2>Recent changes</h2>
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
            {audit.map((a) => (
              <tr key={a.id}>
                <td className="muted">{new Date(a.at).toLocaleString("en-US")}</td>
                <td>{a.actor ?? "unknown"}</td>
                <td>
                  {a.action} {a.entity} {a.entity_id}
                </td>
              </tr>
            ))}
            {audit.length === 0 && (
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
