import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { User } from "@/lib/types";

/* "Admin" is a submenu, not a page: clicking it in the sidebar opens the
   subtabs. Anyone who lands here directly — a bookmark, a typed URL — goes to
   the first subtab rather than an empty shell. */
export default async function AdminPage() {
  const me = await apiFetch<User>("/me");
  if (me.role !== "admin") redirect("/dashboard");
  redirect("/admin/history");
}
