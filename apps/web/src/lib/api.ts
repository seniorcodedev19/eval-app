import { SignJWT } from "jose";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";

/* redirect() and notFound() work by throwing a tagged error that Next catches
   higher up. Checking the digest rather than importing Next's internal
   isRedirectError keeps this off a private module path. */
function isRedirectSignal(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

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
  if (!token) redirect("/login?error=SessionExpired");
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
    // A rejected token means the session is dead; signing in again is the only
    // fix, so go there rather than render an error page the reader can't act on.
    if (res.status === 401) redirect("/login?error=SessionExpired");
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

/* For pages that should show an error message instead of crashing.

   A 401 is the exception. The session is gone, or the signing secret no
   longer matches, so every panel on the page would show the same "Invalid or
   expired token" banner and nothing on it would work. Signing in again is the
   only fix, so send the reader to the sign-in page rather than render a
   broken page around the message. */
export async function tryFetch<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await apiFetch<T>(path) };
  } catch (e) {
    // apiFetch redirects on a dead session, and redirect() signals that by
    // throwing. Catching it here would turn the redirect into a banner, so
    // let it through to Next.
    if (isRedirectSignal(e)) throw e;
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
