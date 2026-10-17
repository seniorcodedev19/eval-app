import InterviewsPanel from "@/components/InterviewsPanel";
import { apiFetch, tryFetch } from "@/lib/api";
import type { Interview, User } from "@/lib/types";

export default async function InterviewsPage() {
  const me = await apiFetch<User>("/me");
  const [list, members] = await Promise.all([
    tryFetch<Interview[]>("/interviews"),
    me.role !== "member" ? tryFetch<User[]>("/users") : null,
  ]);

  return (
    <>
      <h1>Interviews</h1>
      <p className="sub">One-to-one review conversations between a manager and a team member.</p>
      {list.ok ? (
        <InterviewsPanel me={me} interviews={list.data} members={members?.ok ? members.data : []} />
      ) : (
        <div className="banner error">{list.error}</div>
      )}
    </>
  );
}
