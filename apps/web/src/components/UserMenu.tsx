"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Avatar from "./Avatar";
import type { User } from "@/lib/types";

type Theme = "light" | "dark";

function subscribeTheme(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

function getTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function MenuIcon({ name }: { name: "settings" | "sun" | "moon" | "logout" }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (name === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.1" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    );
  }
  if (name === "sun") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </svg>
    );
  }
  if (name === "moon") {
    return (
      <svg {...common}>
        <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M15 17l5-5-5-5M20 12H9M11 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" />
    </svg>
  );
}

/* The account menu at the foot of the sidebar. The avatar row is the trigger;
   the sheet holds the things that used to sit beside it. `logout` is a server
   action form passed down, so sign-out stays on the server. */
export default function UserMenu({ me, logout }: { me: User; logout: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "light" as Theme);
  const dark = theme === "dark";

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* a blocked localStorage shouldn't break the toggle */
    }
  }, []);

  // Close on an outside click or Escape, and hand focus back to the trigger.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="usermenu" ref={wrap}>
      {open ? (
        <div className="usermenu-sheet" role="menu" aria-label="Account">
          <Link className="usermenu-item" href="/profile" role="menuitem" onClick={() => setOpen(false)}>
            <MenuIcon name="settings" />
            <span>Settings</span>
          </Link>

          <button
            type="button"
            className="usermenu-item"
            role="menuitemcheckbox"
            aria-checked={dark}
            onClick={() => setTheme(dark ? "light" : "dark")}
          >
            <MenuIcon name={dark ? "sun" : "moon"} />
            <span>{dark ? "Light mode" : "Dark mode"}</span>
            <span className="usermenu-hint">{dark ? "Dark" : "Light"}</span>
          </button>

          <div className="usermenu-sep" />

          <div className="usermenu-logout" role="menuitem">
            {logout}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        ref={trigger}
        className="who usermenu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={me.name} email={me.email} src={me.avatar} size={40} />
        <span className="who-meta">
          <strong>{me.name || me.email}</strong>
          {me.role}
        </span>
        <span className="usermenu-caret" aria-hidden="true">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9.5 6 6 6-6" />
          </svg>
        </span>
      </button>
    </div>
  );
}
