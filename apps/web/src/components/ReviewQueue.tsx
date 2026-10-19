"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";
import { weekLabel } from "@/lib/dates";
import type { QueueItem } from "@/lib/types";
import Breakdown from "./Breakdown";
import PersonCell from "./PersonCell";

function Item({ q }: { q: QueueItem }) {
  const { error, busy, run } = useAction();
  const [comment, setComment] = useState("");
  const [bonus, setBonus] = useState("0");

  return (
    <div className="item">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <PersonCell
          name={q.name}
          email={q.email}
          avatar={q.avatar}
          href={`/team/${q.user_id}?week=${q.week_start}`}
          sub={`${weekLabel(q.week_start, q.week_end)} · ${q.email}`}
          size={36}
        />
      </div>
      {q.summary && <p style={{ margin: "10px 0" }}>&ldquo;{q.summary}&rdquo;</p>}
      <Breakdown score={q.score} />
      <div className="stack" style={{ marginTop: 12 }}>
        <div className="row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <label htmlFor={`c-${q.report_id}`}>Comment (required if you return it)</label>
            <textarea id={`c-${q.report_id}`} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
          </div>
          <div>
            <label htmlFor={`b-${q.report_id}`}>Bonus points</label>
            <input id={`b-${q.report_id}`} type="number" step="any" min={-100} max={100} value={bonus} onChange={(e) => setBonus(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <button
            className="btn"
            disabled={busy}
            onClick={() => run("POST", `/reports/${q.report_id}/review`, { decision: "approve", comment, bonus: Number(bonus) || 0 })}
          >
            Approve
          </button>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => run("POST", `/reports/${q.report_id}/review`, { decision: "return", comment })}
          >
            Return for changes
          </button>
        </div>
        {error && <div className="msg error" role="alert">{error}</div>}
      </div>
    </div>
  );
}

export default function ReviewQueue({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return <div className="panel empty">Nothing waiting for review.</div>;
  }
  return (
    <div className="panel">
      {items.map((q) => (
        <Item key={q.report_id} q={q} />
      ))}
    </div>
  );
}
