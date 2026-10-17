import test from "node:test";
import assert from "node:assert/strict";
import { computeScore, dayPoints, sumDaily, type WeeklyMetric } from "./scoring";
import { addDays, parseWeek, validDate, weekDays, weekStartOf } from "./dates";

const metrics: WeeklyMetric[] = [
  { id: 1, key: "t", name: "Tasks", formula_type: "ratio", weight: 50, cap: 1.2, target: 10, unit: "tasks" },
  { id: 2, key: "b", name: "Bugs", formula_type: "count", weight: 1, cap: 1.2, target: 0, unit: "bugs" },
];

test("weekly score from daily sums", () => {
  const daily = { 1: { "2026-10-12": 2, "2026-10-13": 3 }, 2: { "2026-10-12": 4 } };
  const entries = metrics.map((m) => ({ metric_id: m.id, planned: m.target, done: sumDaily(daily[m.id as 1 | 2]), bonus: 0 }));
  const s = computeScore(metrics, entries);
  assert.equal(s.total, 29); // 5/10*50 + 4*1
  assert.equal(s.achievement_pct, 50);
});

test("day points are linear per day", () => {
  const daily = { 1: { "2026-10-12": 2 }, 2: { "2026-10-12": 4, "2026-10-14": 1 } };
  const pts = dayPoints(metrics, daily, weekDays("2026-10-12"));
  assert.deepEqual(pts, [14, 0, 1, 0, 0, 0, 0]);
});

test("week boundaries are Monday to Sunday", () => {
  assert.equal(weekStartOf("2026-10-17"), "2026-10-12"); // Saturday
  assert.equal(weekStartOf("2026-10-12"), "2026-10-12"); // Monday
  assert.equal(weekStartOf("2026-10-18"), "2026-10-12"); // Sunday
  assert.equal(weekStartOf("2026-10-19"), "2026-10-19");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(weekDays("2026-10-12")[6], "2026-10-18");
});

test("date validation", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2026-10-17"), true);
  assert.equal(validDate("nope"), false);
  assert.equal(weekStartOf(parseWeek("garbage")).length, 10);
});
