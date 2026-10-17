import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

const googleReady = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await auth())?.user) redirect("/dashboard");
  const sp = await searchParams;
  const badCreds = sp.error === "CredentialsSignin" || sp.error === "CallbackRouteError";

  return (
    <div className="login panel">
      <h1>Sign in to Eval</h1>
      <p className="sub">Use the email and password for your account.</p>
      {badCreds && (
        <div className="banner error" role="alert">
          Invalid email or password.
        </div>
      )}
      {sp.error && !badCreds && (
        <div className="banner error" role="alert">
          Sign-in was refused. Use an account from your company domain.
        </div>
      )}
      <form
        action={async (formData: FormData) => {
          "use server";
          await signIn("credentials", {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
            redirectTo: "/dashboard",
          });
        }}
      >
        <label htmlFor="email">
          Email
          <input id="email" name="email" type="email" autoComplete="username" required placeholder="you@example.com" />
        </label>
        <label htmlFor="password">
          Password
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn" type="submit">
          Sign in
        </button>
      </form>
      {googleReady && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button className="btn secondary" type="submit">
            Continue with Google
          </button>
        </form>
      )}
      <p className="alt">
        No account yet? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
