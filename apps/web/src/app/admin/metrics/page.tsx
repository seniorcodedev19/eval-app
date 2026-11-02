import { redirect } from "next/navigation";
import MetricsManager from "@/components/MetricsManager";
import { apiFetch } from "@/lib/api";
import type { Metric, Team, User } from "@/lib/types";

export default async function AdminMetricsPage() {
  const me = await apiFetch<User>("/me");
  if (me.role !== "admin") redirect("/dashboard");
  const [metrics, teams] = await Promise.all([apiFetch<Metric[]>("/metrics"), apiFetch<Team[]>("/teams")]);

  return (
    <>
      <h1>Metrics</h1>
      <p className="sub">Weight and target changes apply to weeks that aren&apos;t approved yet.</p>
      <MetricsManager me={me} metrics={metrics} teams={teams} />
    </>
  );
}
