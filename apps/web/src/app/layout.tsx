import "./globals.css";
import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { auth, signOut } from "@/auth";
import Nav from "@/components/Nav";
import { tryFetch } from "@/lib/api";
import type { User } from "@/lib/types";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = { title: "Eval", description: "Team performance evaluation" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let me: User | null = null;
  let error: string | null = null;
  if (session?.user?.email) {
    const res = await tryFetch<User>("/me");
    me = res.ok ? res.data : null;
    error = res.ok ? null : res.error;
  }

  return (
    <html lang="en">
      <body className={plex.className}>
        {me ? (
          <div className="shell">
            <Nav me={me} />
            <main className="main">{children}</main>
          </div>
        ) : (
          <main className="main solo">
            {error ? (
              <div className="banner error" role="alert">
                <strong>Can't load your account.</strong> {error}
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button className="btn secondary" type="submit" style={{ marginTop: 10 }}>
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              children
            )}
          </main>
        )}
      </body>
    </html>
  );
}
