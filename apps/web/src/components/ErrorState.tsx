import type { ReactNode } from "react";

/* Shared frame for /404 and the error boundaries: a large code, a heading,
   one line of explanation, and the ways out. Art is drawn from theme tokens
   so it works in both light and dark without an image asset. */

export function LostIllustration() {
  return (
    <svg
      className="errorpage-art"
      viewBox="0 0 220 180"
      role="img"
      aria-label="A disconnected chart panel"
    >
      {/* soft backdrop */}
      <ellipse cx="110" cy="158" rx="78" ry="10" fill="var(--line)" opacity="0.55" />
      <path
        d="M38 36c22-16 58-20 86-10 26 9 52 4 62 18 11 15 2 44-18 56-24 15-70 18-102 9C34 100 18 78 20 62c2-14 6-16 18-26Z"
        fill="var(--accent-wash)"
        opacity="0.6"
      />

      {/* detached panel */}
      <g transform="rotate(-7 104 86)">
        <rect x="52" y="46" width="104" height="76" rx="11" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="2" />
        <rect x="64" y="60" width="34" height="5" rx="2.5" fill="var(--muted)" opacity="0.45" />
        {/* a week of bars, the last one missing */}
        <rect x="64" y="96" width="9" height="14" rx="2.5" fill="var(--s0)" opacity="0.85" />
        <rect x="79" y="86" width="9" height="24" rx="2.5" fill="var(--s0)" opacity="0.85" />
        <rect x="94" y="91" width="9" height="19" rx="2.5" fill="var(--s0)" opacity="0.85" />
        <rect x="109" y="79" width="9" height="31" rx="2.5" fill="var(--s0)" />
        <rect
          x="124"
          y="88"
          width="9"
          height="22"
          rx="2.5"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="1.75"
          strokeDasharray="3 3"
        />
        <path d="M64 110h74" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* unplugged cable */}
      <path
        d="M152 128c16 6 26 2 30-8s-2-19-12-21"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="5 6"
      />
      <circle cx="168" cy="98" r="5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" />
    </svg>
  );
}

export default function ErrorState({
  code,
  title,
  message,
  children,
}: {
  code: string;
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="errorpage">
      <LostIllustration />
      <div className="errorpage-body">
        <p className="errorpage-code">{code}</p>
        <h1 className="errorpage-title">{title}</h1>
        <p className="errorpage-text">{message}</p>
        {children ? <div className="errorpage-actions">{children}</div> : null}
      </div>
    </div>
  );
}
