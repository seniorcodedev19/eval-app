import { Pool, types } from "pg";

// numeric -> number, date -> 'YYYY-MM-DD' string
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(1082, (v) => v);

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
