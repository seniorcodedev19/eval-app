"use client";

import { useRouter } from "next/navigation";
import { useBusy } from "@/components/Busy";
import Dropdown from "@/components/Dropdown";

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
  const { startNav } = useBusy();
  return (
    <Dropdown<string>
      ariaLabel={label}
      value={value}
      options={options.map((o) => ({ value: o.value, label: o.label }))}
      onChange={(v) => {
        const p = new URLSearchParams(extra);
        if (v) p.set(name, v);
        else p.delete(name);
        const q = p.toString();
        startNav();
        router.push(q ? `${base}?${q}` : base);
      }}
    />
  );
}
