"use client";

import { useAction } from "@/lib/client";
import type { Status } from "@/lib/types";
import StatusPill from "./StatusPill";
import Dropdown from "./Dropdown";

const options: { value: Status; label: string }[] = [
  { value: "draft", label: "In progress" },
  { value: "submitted", label: "Waiting for review" },
  { value: "approved", label: "Approved" },
  { value: "returned", label: "Returned" },
];

export default function ReportStatusControl({
  userId,
  weekStart,
  status,
  canEdit,
}: {
  userId: number;
  weekStart: string;
  status: Status;
  canEdit: boolean;
}) {
  const { error, busy, run } = useAction();
  if (!canEdit) return <StatusPill status={status} />;
  return (
    <div>
      <Dropdown<string>
        id={`st-${userId}-${weekStart}`}
        value={status}
        disabled={busy}
        ariaLabel="Report status"
        options={options.map((o) => ({ value: o.value, label: o.label }))}
        onChange={(v) => run("PATCH", "/week/status", { user_id: userId, week_start: weekStart, status: v })}
      />
      {error && (
        <div className="msg error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
