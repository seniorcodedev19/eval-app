import ProfilesPanel from "@/components/ProfilesPanel";
import { tryFetch } from "@/lib/api";
import type { ProfilePerson, TeamProfile, TrainingSite, User } from "@/lib/types";

export default async function ProfilesPage() {
  const [p, s, u, me] = await Promise.all([
    tryFetch<TeamProfile[]>("/profiles"),
    tryFetch<TrainingSite[]>("/training-sites"),
    tryFetch<ProfilePerson[]>("/profile-people"),
    tryFetch<User>("/me"),
  ]);

  if (!p.ok) return <div className="banner error">{p.error}</div>;
  if (!me.ok) return <div className="banner error">{me.error}</div>;

  return (
    <>
      <div className="head">
        <div>
          <h1>Profiles</h1>
          <p className="sub" style={{ margin: 0 }}>
            Profiles you and your team can be assigned to.
          </p>
        </div>
      </div>

      <ProfilesPanel
        profiles={p.data}
        sites={s.ok ? s.data : []}
        people={u.ok ? u.data : []}
        me={me.data}
      />
    </>
  );
}
