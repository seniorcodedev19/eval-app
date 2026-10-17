"use client";

import { useAction } from "@/lib/client";
import type { Status } from "@/lib/types";
import StatusPill from "./StatusPill";

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
      <select
        id={`st-${userId}-${weekStart}`}
        key={status}
        defaultValue={status}
        disabled={busy}
        aria-label="Report status"
        onChange={(e) =>
          run("PATCH", "/week/status", { user_id: userId, week_start: weekStart, status: e.target.value })
        }
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <div className="msg error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
