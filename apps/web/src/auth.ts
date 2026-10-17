import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
const googleReady = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        const res = await fetch(`${apiUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;
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
