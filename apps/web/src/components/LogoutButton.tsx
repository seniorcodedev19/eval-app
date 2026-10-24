"use client";

import { useFormStatus } from "react-dom";
import { Icon, Spinner } from "./Icons";

export default function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="logout-btn" aria-label="Log out" title="Log out" disabled={pending}>
      {pending ? <Spinner size={16} /> : <Icon name="logout" size={18} />}
    </button>
  );
}
