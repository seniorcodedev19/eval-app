import { signOut } from "@/auth";
import type { User } from "@/lib/types";
import Avatar from "./Avatar";
import NavLinks from "./NavLinks";
import ThemeToggle from "./ThemeToggle";

export default function Nav({ me }: { me: User }) {
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/time", label: "Time tracking" },
    { href: "/interviews", label: "Interviews" },
    { href: "/profile", label: "Profile" },
  ];
  if (me.role !== "member") links.splice(1, 0, { href: "/team", label: "Team" });
  if (me.role === "admin") links.push({ href: "/admin", label: "Admin" });

  return (
    <nav className="side" aria-label="Main">
      <div className="brand">Eval</div>
      <NavLinks links={links} />
      <div className="side-footer">
        <ThemeToggle />
        <div className="who">
          <Avatar name={me.name} email={me.email} src={me.avatar} size={40} />
          <div className="who-meta">
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
        </div>
      </div>
    </nav>
  );
}
