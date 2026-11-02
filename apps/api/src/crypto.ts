import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const PREFIX = "v1";

function secretMaterial(): string {
  for (const value of [process.env.AGENT_TOKEN_SECRET, process.env.API_JWT_SECRET]) {
    const secret = (value ?? "").trim();
    if (secret.length >= 16) return secret;
  }
  throw new Error("AGENT_TOKEN_SECRET or API_JWT_SECRET must be set (16+ characters)");
}

function key(): Buffer {
  return scryptSync(secretMaterial(), "eval-agent-tokens", 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return `${PREFIX}.${iv.toString("base64url")}.${enc.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptSecret(packed: string): string {
  const [ver, ivB64, dataB64, tagB64] = packed.split(".");
  if (ver !== PREFIX || !ivB64 || !dataB64 || !tagB64) throw new Error("Invalid encrypted secret");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64url"));
  d.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([d.update(Buffer.from(dataB64, "base64url")), d.final()]).toString("utf8");
}
