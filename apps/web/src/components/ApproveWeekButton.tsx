"use client";

import { useAction } from "@/lib/client";

export default function ApproveWeekButton({ reportId }: { reportId: number }) {
  const { error, busy, run } = useAction();
  return (
    <div>
      <button
        className="btn"
        disabled={busy}
        onClick={() => run("POST", `/reports/${reportId}/review`, { decision: "approve", bonus: 0 })}
      >
        Approve
      </button>
      {error && (
        <div className="msg error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
