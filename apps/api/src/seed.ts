import { pool } from "./db";
import { hashPassword } from "./password";

async function main() {
  await pool.query("insert into teams (name) values ('Engineering') on conflict do nothing");
  const adminEmail = "kherrmann9319@gmail.com";
  const adminHash = await hashPassword("admin");
  await pool.query(
    `insert into users (email, name, role, password_hash)
     values ($1, $2, 'admin', $3)
     on conflict (email) do update set
       role = 'admin',
       password_hash = excluded.password_hash,
       name = coalesce(nullif(users.name, ''), excluded.name)`,
    [adminEmail, "Admin", adminHash],
  );
  // Global metrics (team_id null) apply to every team. Managers add their own per team in the app.
  await pool.query(
    `insert into metrics (key, name, formula_type, weight, cap, target, unit) values
       ('tasks_completed', 'Tasks completed', 'ratio', 50, 1.2, 10, 'tasks'),
       ('code_reviews', 'Code reviews', 'ratio', 30, 1.2, 5, 'reviews'),
       ('bugs_fixed', 'Bugs fixed', 'count', 1, 1.2, 0, 'bugs'),
       ('docs_shared', 'Docs or talks shared', 'count', 2, 1.2, 0, 'items')
     on conflict (key) do nothing`,
  );
  console.log("seeded a team, four starter metrics, and the admin user");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
