import { redirect } from "next/navigation";
import { weekParam } from "@/lib/dates";

export default async function ReportRedirect({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const week = weekParam((await searchParams).week);
  redirect(week ? `/dashboard?week=${week}` : "/dashboard");
}
