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
