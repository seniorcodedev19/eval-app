"use client";

import { useFormStatus } from "react-dom";

export default function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="usermenu-item danger" disabled={pending}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 17l5-5-5-5M20 12H9M11 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" />
      </svg>
      <span>{pending ? "Logging out…" : "Log out"}</span>
    </button>
  );
}
