import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await auth())?.user) redirect("/dashboard");
  const sp = await searchParams;
  const devLogin = process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";

  return (
    <div className="login panel">
      <h1>Sign in to Eval</h1>
      <p className="sub">Use your company Google account.</p>
      {sp.error && (
        <div className="banner error" role="alert">
          Sign-in was refused. Use an account from your company domain.
        </div>
      )}
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button className="btn" type="submit">
          Continue with Google
        </button>
      </form>

      {devLogin && (
        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("credentials", { email: String(formData.get("email") ?? ""), redirectTo: "/dashboard" });
          }}
        >
          <label htmlFor="email">Local development only: sign in by email</label>
          <div className="row">
            <input id="email" name="email" type="email" required placeholder="you@example.com" />
            <button className="btn secondary" type="submit">
              Sign in
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
