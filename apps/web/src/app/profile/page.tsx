import ProfileForm from "@/components/ProfileForm";
import ProfileHeader from "@/components/ProfileHeader";
import { tryFetch } from "@/lib/api";
import type { HistoryPoint, Profile } from "@/lib/types";

export default async function ProfilePage() {
  const [p, h] = await Promise.all([
    tryFetch<Profile>("/profile"),
    tryFetch<HistoryPoint[]>("/history"),
  ]);

  if (!p.ok) return <div className="banner error">{p.error}</div>;

  return (
    <>
      <div className="head">
        <div>
          <h1>My profile</h1>
          <p className="sub" style={{ margin: 0 }}>
            How you appear to your team.
          </p>
        </div>
      </div>

      <ProfileHeader profile={p.data} history={h.ok ? h.data : null} />

      <div className="panel" style={{ marginTop: 12 }}>
        <h2 className="panel-title">Edit profile</h2>
        <ProfileForm profile={p.data} />
      </div>
    </>
  );
}
