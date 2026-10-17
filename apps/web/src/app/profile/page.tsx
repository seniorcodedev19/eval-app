import ProfileForm from "@/components/ProfileForm";
import { tryFetch } from "@/lib/api";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
  const p = await tryFetch<Profile>("/profile");
  return (
    <>
      <h1>Profile</h1>
      <p className="sub">How you appear to your team.</p>
      {p.ok ? <ProfileForm profile={p.data} /> : <div className="banner error">{p.error}</div>}
    </>
  );
}
