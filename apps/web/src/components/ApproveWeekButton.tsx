"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";

export default function ApproveWeekButton({ reportId }: { reportId: number }) {
  const { error, busy, run } = useAction();
  const [comment, setComment] = useState("");

  return (
    <div className="review-bar">
      <div className="review-comment">
        <label htmlFor={`c-${reportId}`}>Comment</label>
        <textarea
          id={`c-${reportId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          placeholder="Optional for approve, required to reject"
        />
      </div>
      <button
        className="btn danger"
        disabled={busy}
        onClick={() => run("POST", `/reports/${reportId}/review`, { decision: "return", comment })}
      >
        Reject
      </button>
      <button
        className="btn"
        disabled={busy}
        onClick={() => run("POST", `/reports/${reportId}/review`, { decision: "approve", comment, bonus: 0 })}
      >
        Approve
      </button>
      {error ? (
        <div className="msg error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
