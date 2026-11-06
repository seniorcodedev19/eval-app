import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
const googleReady = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    ...(googleReady
      ? [
          Google({
            authorization: { params: { prompt: "select_account", ...(domain ? { hd: domain } : {}) } },
          }),
        ]
      : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        let res: Response;
        try {
          res = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
        } catch {
          // The API is unreachable. Throwing keeps this distinct from a wrong
          // password, which returns null, so the page can say which it was.
          throw new Error(`Can't reach the API at ${apiUrl}. Is it running?`);
        }
        if (res.status === 401 || res.status === 403) return null;
        if (!res.ok) throw new Error(`The API returned ${res.status} while signing in.`);
        const user = (await res.json()) as { id: number; email: string; name: string };
        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        if (!profile?.email_verified) return false;
        if (domain && !profile.email?.toLowerCase().endsWith(`@${domain}`)) return false;
      }
      return true;
    },
  },
});
