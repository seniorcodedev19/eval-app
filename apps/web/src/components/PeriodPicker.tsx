"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Period } from "@/lib/types";

export default function PeriodPicker({ periods, value }: { periods: Period[]; value: number }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();

  return (
    <div>
      <label htmlFor="period">Period</label>
      <select
        id="period"
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(sp.toString());
          params.set("period", e.target.value);
          router.push(`${path}?${params.toString()}`);
        }}
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {p.locked ? " (locked)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
