"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";

const icons = {
  "/dashboard": "dashboard",
  "/team": "team",
  "/time": "time",
  "/interviews": "interviews",
  "/profile": "profile",
  "/admin": "admin",
} as const;

export default function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <>
      {links.map((l) => {
        const active = path.startsWith(l.href);
        const icon = icons[l.href as keyof typeof icons];
        return (
          <Link key={l.href} href={l.href} className="link" aria-current={active ? "page" : undefined}>
            {icon ? <Icon name={icon} /> : null}
            <span>{l.label}</span>
          </Link>
        );
      })}
    </>
  );
}
