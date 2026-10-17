import { signOut } from "@/auth";
import type { User } from "@/lib/types";
import NavLinks from "./NavLinks";

export default function Nav({ me }: { me: User }) {
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/report", label: "Report" },
    { href: "/time", label: "Time tracking" },
    { href: "/interviews", label: "Interviews" },
    { href: "/profile", label: "Profile" },
  ];
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
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="link" type="submit" style={{ padding: "8px 0" }}>
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
