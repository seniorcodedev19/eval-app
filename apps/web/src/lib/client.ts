"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export async function call(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/proxy${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const j = await res.json().catch(() => ({}));
    return { ok: false, error: j.error ?? `Request failed (${res.status})` };
  } catch {
    return { ok: false, error: "Network error. Try again." };
  }
}

// Run a request, show its error, refresh server data on success.
export function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (method: string, path: string, body?: unknown) => {
    setError(null);
    setBusy(true);
    const r = await call(method, path, body);
    setBusy(false);
    if (!r.ok) setError(r.error);
    else router.refresh();
    return r.ok;
  };
  return { error, busy, run, setError };
}
