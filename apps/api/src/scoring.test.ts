import test from "node:test";
import assert from "node:assert/strict";
import { computeScore, type MetricDef } from "./scoring";

const metrics: MetricDef[] = [
  { id: 1, key: "tasks", name: "Tasks", formula_type: "ratio", weight: 50, cap: 1.2 },
  { id: 2, key: "reviews", name: "Reviews", formula_type: "count", weight: 0.5, cap: 1.2 },
];

test("ratio metric: done / planned * weight + bonus", () => {
  const s = computeScore(metrics, [{ metric_id: 1, planned: 10, done: 8, bonus: 2 }]);
  assert.equal(s.total, 42); // 0.8 * 50 + 2
  assert.equal(s.achievement_pct, 80);
});

test("count metric: done * weight + bonus", () => {
  const s = computeScore(metrics, [{ metric_id: 2, planned: 0, done: 10, bonus: 1 }]);
  assert.equal(s.total, 6); // 10 * 0.5 + 1
  assert.equal(s.achievement_pct, null);
});

test("ratio is capped", () => {
  const s = computeScore(metrics, [{ metric_id: 1, planned: 2, done: 20, bonus: 0 }]);
  assert.equal(s.total, 60); // cap 1.2 * 50
});

test("planned = 0 on a ratio metric is n/a and keeps only the bonus", () => {
  const s = computeScore(metrics, [{ metric_id: 1, planned: 0, done: 5, bonus: 3 }]);
  assert.equal(s.total, 3);
  assert.equal(s.breakdown[0].na, true);
  assert.equal(s.achievement_pct, null);
});

test("metrics without entries are skipped; combined total", () => {
  const s = computeScore(metrics, [
    { metric_id: 1, planned: 4, done: 4, bonus: 0 },
    { metric_id: 2, planned: 0, done: 4, bonus: 0 },
  ]);
  assert.equal(s.breakdown.length, 2);
  assert.equal(s.total, 52); // 50 + 2
});

test("no entries gives a zero score", () => {
  const s = computeScore(metrics, []);
  assert.equal(s.total, 0);
  assert.equal(s.breakdown.length, 0);
});

const overtime: MetricDef = {
  id: 3,
  key: "hours",
  name: "Tracked time",
  formula_type: "overtime",
  weight: 90,
  cap: 1,
  overtime_rate: 1,
};

test("overtime: hours at the target are base; extra hours are bonus", () => {
  const s = computeScore([overtime], [{ metric_id: 3, planned: 90, done: 95, bonus: 0 }]);
  assert.equal(s.base, 90); // 90/90 * 90
  assert.equal(s.bonus, 5); // 5 * 1
  assert.equal(s.total, 95);
  assert.equal(s.breakdown.length, 2);
  assert.equal(s.breakdown[0].part, "base");
  assert.equal(s.breakdown[1].part, "bonus");
  assert.equal(s.achievement_pct, 100);
});

test("overtime under the target has no bonus node points", () => {
  const s = computeScore([overtime], [{ metric_id: 3, planned: 90, done: 80, bonus: 0 }]);
  assert.equal(s.base, 80); // 80/90 * 90
  assert.equal(s.bonus, 0);
  assert.equal(s.total, 80);
  assert.equal(s.achievement_pct, 88.89);
});
