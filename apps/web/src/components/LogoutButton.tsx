"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "./Icons";

export default function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="logout-btn" aria-label="Log out" title="Log out" disabled={pending}>
      <Icon name="logout" size={18} />
    </button>
  );
}
