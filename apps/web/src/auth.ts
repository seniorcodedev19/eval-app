import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
// Email-only sign-in for local development. Never enabled in production builds.
const devLogin = process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: { params: { prompt: "select_account", ...(domain ? { hd: domain } : {}) } },
    }),
    ...(devLogin
      ? [
          Credentials({
            credentials: { email: {} },
            async authorize(creds) {
              const email = String(creds?.email ?? "").trim().toLowerCase();
              return email ? { id: email, email, name: email.split("@")[0] } : null;
            },
          }),
        ]
      : []),
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
