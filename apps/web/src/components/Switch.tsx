"use client";

/* A sliding on/off switch, in place of a checkbox. Built on a button with
   role="switch" rather than a styled <input type=checkbox>, so the thumb can
   animate and the control keeps a real accessible name and state.

   Space and Enter toggle it, as they do for any button. */
export default function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name. Pass one unless a <label htmlFor> already names it. */
  label?: string;
  id?: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`switch${checked ? " on" : ""}${size === "sm" ? " sm" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-thumb" aria-hidden="true" />
    </button>
  );
}
