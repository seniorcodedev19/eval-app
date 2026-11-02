import { redirect } from "next/navigation";
import AdminPanels from "@/components/AdminPanels";
import { apiFetch } from "@/lib/api";
import type { Team, User } from "@/lib/types";

export default async function AdminUsersPage() {
  const me = await apiFetch<User>("/me");
  if (me.role !== "admin") redirect("/dashboard");
  const [users, teams] = await Promise.all([apiFetch<User[]>("/users"), apiFetch<Team[]>("/teams")]);

  return (
    <>
      <h1>Users</h1>
      <p className="sub">People, roles, and teams.</p>
      <AdminPanels me={me} users={users} teams={teams} />
    </>
  );
}
