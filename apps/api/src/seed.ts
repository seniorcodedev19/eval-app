import { pool } from "./db";

async function main() {
  await pool.query("insert into teams (name) values ('Engineering') on conflict do nothing");
  // Global metrics (team_id null) apply to every team. Managers add their own per team in the app.
  await pool.query(
    `insert into metrics (key, name, formula_type, weight, cap, target, unit) values
       ('tasks_completed', 'Tasks completed', 'ratio', 50, 1.2, 10, 'tasks'),
       ('code_reviews', 'Code reviews', 'ratio', 30, 1.2, 5, 'reviews'),
       ('bugs_fixed', 'Bugs fixed', 'count', 1, 1.2, 0, 'bugs'),
       ('docs_shared', 'Docs or talks shared', 'count', 2, 1.2, 0, 'items')
     on conflict (key) do nothing`,
  );
  console.log("seeded a team and four starter metrics");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
