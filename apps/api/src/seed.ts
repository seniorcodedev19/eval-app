import { pool } from "./db";

async function main() {
  await pool.query("insert into teams (name) values ('Engineering') on conflict do nothing");
  await pool.query(
    `insert into metrics (key, name, formula_type, weight, cap) values
       ('tasks_delivered', 'Tasks delivered vs planned', 'ratio', 50, 1.2),
       ('sprint_commitments', 'Sprint commitments kept', 'ratio', 30, 1.2),
       ('code_reviews', 'Code reviews completed', 'count', 0.5, 1.2),
       ('knowledge_sharing', 'Talks and docs shared', 'count', 2, 1.2)
     on conflict (key) do nothing`,
  );
  await pool.query(
    `insert into periods (label, start_date, end_date) values ('2026-Q4', '2026-10-01', '2026-12-31')
     on conflict (label) do nothing`,
  );
  console.log("seeded teams, metrics, and a period");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
