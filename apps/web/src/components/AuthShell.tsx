import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Icons";

/* Split auth card: branded panel on the left, form on the right. */
export default function AuthShell({
  active,
  children,
}: {
  active: "login" | "signup";
  children: ReactNode;
}) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <span className="auth-side-logo">
          <Logo size={38} />
        </span>
        <p className="auth-side-name">Team Huddle</p>
        <p className="auth-side-tag">Connect. Collaborate. Grow.</p>

        <svg className="auth-side-art" viewBox="0 0 240 150" aria-hidden="true">
          <ellipse cx="120" cy="132" rx="84" ry="10" fill="#fff" opacity="0.14" />
          <circle cx="52" cy="40" r="20" fill="#fff" opacity="0.1" />
          <circle cx="196" cy="54" r="27" fill="#fff" opacity="0.08" />
          {/* a week of bars, rising */}
          <g opacity="0.92">
            <rect x="72" y="86" width="15" height="30" rx="5" fill="#fff" opacity="0.5" />
            <rect x="94" y="72" width="15" height="44" rx="5" fill="#fff" opacity="0.62" />
            <rect x="116" y="58" width="15" height="58" rx="5" fill="#fff" opacity="0.76" />
            <rect x="138" y="44" width="15" height="72" rx="5" fill="#fff" opacity="0.9" />
          </g>
          <path
            d="M72 80 94 66l22-14 22-14"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
          <circle cx="160" cy="36" r="4.5" fill="#fff" />
        </svg>
      </aside>

      <section className="auth-main">
        <nav className="auth-tabs" aria-label="Account">
          <Link href="/login" className={active === "login" ? "on" : ""} aria-current={active === "login"}>
            Log In
          </Link>
          <Link href="/signup" className={active === "signup" ? "on" : ""} aria-current={active === "signup"}>
            Sign Up
          </Link>
        </nav>
        {children}
      </section>
    </div>
  );
}
