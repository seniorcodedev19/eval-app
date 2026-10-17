# Eval: team performance evaluation

Next.js (web) + Express (API) + PostgreSQL, Google sign-in, admin page.

```
apps/web   Next.js 15 (App Router), Auth.js v5 (Google), proxies API calls
apps/api   Express + pg, scoring engine, role checks, audit log
```

The browser only talks to Next.js. Next.js verifies the Google session, then calls the
Express API with a short-lived signed token (`API_JWT_SECRET`). No CORS or cross-domain cookies.

## Run locally

Requirements: Node 20+, Docker (for Postgres).

```bash
npm install
cp apps/api/.env.example apps/api/.env          # set ADMIN_EMAILS to your email
cp apps/web/.env.example apps/web/.env.local    # set AUTH_SECRET and API_JWT_SECRET
npm run db:up
npm run db:migrate
npm run db:seed        # sample team, metrics and a 2026-Q4 period
npm run dev            # web on :3000, API on :4000
```

`API_JWT_SECRET` must be identical in both env files. `AUTH_SECRET`: `openssl rand -base64 32`.

Open http://localhost:3000. With `AUTH_DEV_LOGIN=true` (local only) you can sign in with any email
without Google. Use the email you put in `ADMIN_EMAILS` to become admin, then:

1. Admin > People: set roles and teams (people appear after their first sign-in).
2. Team > open a person > Enter results.
3. Admin > Review periods > Lock to freeze scores.

### Google sign-in
Google Cloud Console > Credentials > OAuth client (Web). Authorized redirect URI:
`http://localhost:3000/api/auth/callback/google`. Put the id and secret in `apps/web/.env.local`.
Set `ALLOWED_EMAIL_DOMAIN` to restrict sign-in to your company.

## Scoring

```
ratio metric: min(done / planned, cap) * weight + bonus
count metric: done * weight + bonus
total = sum over metrics
```
A ratio metric with planned = 0 is "n/a" (only its bonus counts). Achievement % is the weighted
average of ratio metrics. Logic: `apps/api/src/scoring.ts`, tests: `npm test`.

## Roles
- member: sees own score
- manager: sees and edits people in their team
- admin: everything, plus users, teams, metrics, periods, audit log

## Deploy to Vercel
Two Vercel projects from this repo:

| Project | Root Directory |
|---|---|
| web | `apps/web` |
| api | `apps/api` (zero-config Express, entry `src/index.ts`) |

Database: Neon via the Vercel Marketplace (pooled `DATABASE_URL`), then run
`npm run db:migrate` once with that URL.

Env vars
- web: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `API_URL` (the api project's URL), `API_JWT_SECRET`, optional `ALLOWED_EMAIL_DOMAIN`. Leave `AUTH_DEV_LOGIN` unset.
- api: `DATABASE_URL`, `API_JWT_SECRET`, `ADMIN_EMAILS`.

Add `https://<your-web-domain>/api/auth/callback/google` to the Google OAuth redirect URIs.
