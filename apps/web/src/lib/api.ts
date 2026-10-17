import { SignJWT } from "jose";
import { auth } from "@/auth";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Short-lived token proving to the Express API who the signed-in user is.
export async function signApiToken(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const secret = new TextEncoder().encode(process.env.API_JWT_SECRET ?? "");
  return new SignJWT({ email, name: session.user?.name ?? "" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(secret);
}

export async function apiFetch<T>(path: string): Promise<T> {
  const token = await signApiToken();
  if (!token) throw new ApiError(401, "Not signed in");
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(503, `Can't reach the API at ${API_URL}. Is it running?`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// For pages that should show an error message instead of crashing.
export async function tryFetch<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await apiFetch<T>(path) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
