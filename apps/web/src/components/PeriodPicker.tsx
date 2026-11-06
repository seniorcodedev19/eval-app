"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useBusy } from "@/components/Busy";
import Dropdown from "@/components/Dropdown";
import type { Period } from "@/lib/types";

export default function PeriodPicker({ periods, value }: { periods: Period[]; value: number }) {
  const router = useRouter();
  const { startNav } = useBusy();
  const path = usePathname();
  const sp = useSearchParams();

  return (
    <div>
      <label htmlFor="period">Period</label>
      <Dropdown<number>
        id="period"
        ariaLabel="Period"
        value={value}
        options={periods.map((p) => ({
          value: p.id,
          label: `${p.label}${p.locked ? " (locked)" : ""}`,
        }))}
        onChange={(v) => {
          const params = new URLSearchParams(sp.toString());
          params.set("period", String(v));
          startNav();
          router.push(`${path}?${params.toString()}`);
        }}
      />
    </div>
  );
}
