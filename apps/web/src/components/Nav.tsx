import { signOut } from "@/auth";
import type { User } from "@/lib/types";
import NavLinks from "./NavLinks";

export default function Nav({ me }: { me: User }) {
  const links = [{ href: "/", label: "My score" }];
  if (me.role !== "member") links.push({ href: "/team", label: "Team" });
  if (me.role === "admin") links.push({ href: "/admin", label: "Admin" });

  return (
    <nav className="side" aria-label="Main">
      <div className="brand">Eval</div>
      <NavLinks links={links} />
      <div className="who">
        <strong>{me.name || me.email}</strong>
        {me.role}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="link" type="submit" style={{ padding: "8px 0" }}>
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
