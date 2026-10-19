"use client";

import { useRouter } from "next/navigation";

export default function QuerySelect({
  base,
  name,
  value,
  extra = {},
  label,
  options,
}: {
  base: string;
  name: string;
  value: string;
  extra?: Record<string, string>;
  label: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => {
        const p = new URLSearchParams(extra);
        if (e.target.value) p.set(name, e.target.value);
        else p.delete(name);
        const q = p.toString();
        router.push(q ? `${base}?${q}` : base);
      }}
    >
      {options.map((o) => (
        <option key={o.value || "all"} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
