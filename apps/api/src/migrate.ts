import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pool } from "./db";

async function main() {
  await pool.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const dir = join(__dirname, "..", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const done = await pool.query("select 1 from schema_migrations where name=$1", [f]);
    if (done.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(readFileSync(join(dir, f), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log("applied", f);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
