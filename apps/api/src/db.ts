import { Pool, types, type PoolConfig } from "pg";

// numeric -> number, date -> 'YYYY-MM-DD' string
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(1082, (v) => v);

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function connectionMeta(raw: string | undefined) {
  if (!raw) return { connectionString: raw, local: true, pooler: false };
  let url: URL;
  try {
    url = new URL(raw.replace(/^postgresql:/i, "postgres:"));
  } catch {
    return { connectionString: raw, local: false, pooler: false };
  }
  const pooler =
    url.port === "6543" ||
    url.searchParams.get("pgbouncer") === "true" ||
    url.hostname.includes("pooler.supabase.com");
  if (url.searchParams.has("pgbouncer")) {
    url.searchParams.delete("pgbouncer");
  }
  return {
    connectionString: url.toString(),
    local: isLocalHost(url.hostname),
    pooler,
  };
}

export function poolConfig(connectionString = process.env.DATABASE_URL): PoolConfig {
  const meta = connectionMeta(connectionString);
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const sslOverride = process.env.DATABASE_SSL;
  const ssl =
    sslOverride === "false" || sslOverride === "0"
      ? false
      : sslOverride === "true" || sslOverride === "1" || !meta.local
        ? { rejectUnauthorized: false }
        : false;

  return {
    connectionString: meta.connectionString,
    ssl,
    max: serverless ? 1 : meta.pooler ? 8 : 5,
    idleTimeoutMillis: serverless ? 5_000 : 20_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: !serverless,
    allowExitOnIdle: serverless,
  };
}

export function makePool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    console.warn("DATABASE_URL is not set");
  }
  return new Pool(poolConfig(connectionString));
}

export const pool = makePool();
