import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { API_URL } from "@/lib/api";

export async function createAccount(email: string, password: string, name: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
  } catch {
    return `Can't reach the API at ${API_URL}. Is it running?`;
  }
  if (res.ok) return null;
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Could not create the account";
}

export async function signInWithPassword(email: string, password: string, redirectTo = "/dashboard") {
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      // CredentialsSignin means authorize() returned null: a bad email or
      // password. Anything else (CallbackRouteError) means authorize() threw,
      // so the sign-in broke for a different reason worth reporting as such.
      const kind = error.type === "CredentialsSignin" ? "CredentialsSignin" : "SignInFailed";
      redirect(`/login?error=${kind}`);
    }
    throw error;
  }
}
