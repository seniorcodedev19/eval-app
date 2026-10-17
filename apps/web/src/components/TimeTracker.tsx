"use client";

import { useState } from "react";
import { useAction } from "@/lib/client";
import { addDays, dayMonth, shortDay } from "@/lib/dates";
import { hours } from "@/lib/format";
import type { TimeWeek } from "@/lib/types";

export default function TimeTracker({ data }: { data: TimeWeek }) {
  const { error, busy, run } = useAction();
  const lastDay = addDays(data.today, 1);
  const choices = data.days.filter((d) => d <= lastDay);
  const [date, setDate] = useState(choices.includes(data.today) ? data.today : (choices[choices.length - 1] ?? data.days[0]));
  const [task, setTask] = useState("");
  const [hrs, setHrs] = useState("1");

  const minutes = Math.round(Number(hrs) * 60);
  const valid = task.trim().length > 0 && minutes >= 1 && minutes <= 1440;

  return (
    <div className="stack">
      <div className="panel">
        <div className="row">
          <div>
            <label htmlFor="t-date">Day</label>
            <select id="t-date" value={date} onChange={(e) => setDate(e.target.value)}>
              {choices.map((d) => (
                <option key={d} value={d}>
                  {shortDay(d)} {dayMonth(d)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label htmlFor="t-task">What did you work on?</label>
            <input id="t-task" style={{ width: "100%" }} maxLength={120} value={task} onChange={(e) => setTask(e.target.value)} />
          </div>
          <div>
            <label htmlFor="t-hrs">Hours</label>
            <input id="t-hrs" type="number" min={0.25} max={24} step={0.25} value={hrs} onChange={(e) => setHrs(e.target.value)} />
          </div>
          <button
            className="btn"
            disabled={!valid || busy || choices.length === 0}
            onClick={async () => {
              if (await run("POST", "/time", { log_date: date, minutes, task })) setTask("");
            }}
          >
            Add time
          </button>
        </div>
        {error && <div className="msg error" role="alert">{error}</div>}
      </div>

      <div className="panel tablewrap">
        {data.logs.length === 0 ? (
          <div className="empty">No time logged this week.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Task</th>
                <th className="n">Time</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l.id}>
                  <td>
                    {shortDay(l.log_date)} {dayMonth(l.log_date)}
                  </td>
                  <td>{l.task}</td>
                  <td className="n">{hours(l.minutes)}</td>
                  <td className="n">
                    <button className="btn secondary" disabled={busy} onClick={() => run("DELETE", `/time/${l.id}`)} aria-label={`Delete ${l.task}`}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
