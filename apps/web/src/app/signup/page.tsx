import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { createAccount } from "@/lib/account";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await auth())?.user) redirect("/dashboard");
  const sp = await searchParams;

  return (
    <div className="login panel">
      <h1>Create an account</h1>
      <p className="sub">Sign up with your work email. Your manager can assign a team after you join.</p>
      {sp.error && (
        <div className="banner error" role="alert">
          {sp.error}
        </div>
      )}
      <form
        action={async (formData: FormData) => {
          "use server";
          const email = String(formData.get("email") ?? "").trim();
          const password = String(formData.get("password") ?? "");
          const name = String(formData.get("name") ?? "").trim();
          const error = await createAccount(email, password, name);
          if (error) redirect(`/signup?error=${encodeURIComponent(error)}`);
          await signIn("credentials", { email, password, redirectTo: "/dashboard" });
        }}
      >
        <label htmlFor="name">
          Name
          <input id="name" name="name" type="text" autoComplete="name" placeholder="Your name" />
        </label>
        <label htmlFor="email">
          Email
          <input id="email" name="email" type="email" autoComplete="username" required placeholder="you@example.com" />
        </label>
        <label htmlFor="password">
          Password
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </label>
        <button className="btn" type="submit">
          Sign up
        </button>
      </form>
      <p className="alt">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
