"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icons";

export type NavItem = { href: string; label: string; children?: NavItem[] };

const icons = {
  "/dashboard": "dashboard",
  "/team": "team",
  "/time": "time",
  "/interviews": "interviews",
  "/agent": "agent",
  "/profile": "profile",
  "/admin": "admin",
  "/admin/users": "team",
  "/admin/metrics": "metrics",
  "/admin/agent": "agent",
} as const;

function isCurrent(href: string, path: string) {
  if (href === "/admin") return path === "/admin" || path.startsWith("/admin/");
  return path === href || path.startsWith(`${href}/`);
}

export default function NavLinks({ links }: { links: NavItem[] }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <>
      {links.map((l) => {
        const icon = icons[l.href as keyof typeof icons];
        const expanded = open[l.href] ?? isCurrent(l.href, path);
        return (
          <div key={l.href} className="nav-group">
            <Link
              href={l.href}
              className="link"
              aria-current={isCurrent(l.href, path) ? "page" : undefined}
              aria-expanded={l.children?.length ? expanded : undefined}
              onClick={(e) => {
                if (!l.children?.length) return;
                e.preventDefault();
                const next = !expanded;
                setOpen((s) => ({ ...s, [l.href]: next }));
                if (next && !isCurrent(l.href, path)) router.push(l.href);
              }}
            >
              {icon ? <Icon name={icon} /> : null}
              <span>{l.label}</span>
              {l.children?.length ? <span className={`nav-caret${expanded ? " open" : ""}`}>▸</span> : null}
            </Link>
            {l.children?.length && expanded ? (
              <div className="nav-sub">
                {l.children.map((c) => {
                  const childIcon = icons[c.href as keyof typeof icons];
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      className="link"
                      aria-current={isCurrent(c.href, path) ? "page" : undefined}
                    >
                      {childIcon ? <Icon name={childIcon} /> : null}
                      <span>{c.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
