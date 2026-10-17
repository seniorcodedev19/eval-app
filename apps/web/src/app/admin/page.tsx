import { redirect } from "next/navigation";
import AdminPanels from "@/components/AdminPanels";
import { apiFetch } from "@/lib/api";
import type { AuditRow, Metric, Period, Team, User } from "@/lib/types";

export default async function AdminPage() {
  const me = await apiFetch<User>("/me");
  if (me.role !== "admin") redirect("/");

  const [users, teams, metrics, periods, audit] = await Promise.all([
    apiFetch<User[]>("/users"),
    apiFetch<Team[]>("/teams"),
    apiFetch<Metric[]>("/metrics"),
    apiFetch<Period[]>("/periods"),
    apiFetch<AuditRow[]>("/audit?limit=30"),
  ]);

  return (
    <>
      <h1>Admin</h1>
      <p className="sub">People, teams, metrics and review periods.</p>
      <AdminPanels me={me} users={users} teams={teams} metrics={metrics} periods={periods} />

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
