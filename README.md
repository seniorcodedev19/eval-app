# Eval: weekly team performance

Next.js (web) + Express (API) + PostgreSQL. Google sign-in. Landing page, then a signed-in app with
tabs: Dashboard, Report, Time tracking, Interviews, Profile, Log out (plus Admin for admins).

```
apps/web   Next.js 15 (App Router), Auth.js v5 (Google), proxies API calls
apps/api   Express + pg, scoring, roles, audit log
```

## How it works

1. A **manager** creates metrics for their team (Report tab > Metrics): a name, a formula, a weight, a weekly target and a unit.
2. Each **member** enters daily numbers (Dashboard "Today" box, or the week grid on the Report tab). Totals update as they type.
3. At the weekend the member **submits** the week with an optional note.
4. The **manager reviews**: approve (optionally adding bonus points) or return with a comment. Approving stores the final score; the week is then locked.
5. Everyone sees the current week's progress on the Dashboard. Managers also see the team bar chart (orderable by points, achievement or name) and a review queue.

Scoring (Sunday–Saturday week):
```
ratio metric:    min(sum(daily) / weekly target, cap) * weight
count metric:    sum(daily) * weight
overtime metric: (min(done, target) / target * weight) + (max(0, done - target) * overtime bonus)
                 e.g. 95 hours vs 90: (90/90 * weight) + (5 * bonus)
total = sum of metrics + manager bonus (on approve)
```
Logic: `apps/api/src/scoring.ts` (tests: `npm test`). Team and person pages use the same weekly snapshot as Dashboard.

Roles: **member** (own data), **manager** (their team: metrics, reviews, interviews, team views), **admin** (everything, plus people and teams).
Nobody can approve their own report; an admin reviews managers' weeks.

## Run locally

Requirements: Node 20+, and PostgreSQL (local Docker or [Supabase](https://supabase.com)).

```bash
npm install
cp apps/api/.env.example apps/api/.env          # set DATABASE_URL and ADMIN_EMAILS
cp apps/web/.env.example apps/web/.env.local    # set AUTH_SECRET and API_JWT_SECRET
npm run db:up          # skip if DATABASE_URL already points at Supabase
npm run db:migrate
npm run db:seed        # one team and four starter metrics
npm run dev            # web on :3000, API on :4000
```

### Supabase
In the project: **Settings > Database**. Use the **transaction pooler** URI (port `6543`) as `DATABASE_URL` for the API, and the **session pooler or direct** URI (port `5432`) as `DIRECT_URL` for `db:migrate` / `db:seed`. The API turns on SSL for any non-localhost host.

`API_JWT_SECRET` must be identical in both env files. `AUTH_SECRET`: `openssl rand -base64 32`.

Open http://localhost:3000. With `AUTH_DEV_LOGIN=true` (local only) the login page has an email-only form, so you
can try roles without Google: sign in as your `ADMIN_EMAILS` address, then in another browser profile as
`manager@example.com` and `member@example.com`, and set their roles and team under Admin.

Already ran the first version? `npm run db:migrate` applies `002_weekly.sql`, which replaces the old
quarterly tables (old entries and periods are dropped).

### Google sign-in
Google Cloud Console > Credentials > OAuth client (Web). Redirect URI:
`http://localhost:3000/api/auth/callback/google`. Put the id and secret in `apps/web/.env.local`.
Leave `ALLOWED_EMAIL_DOMAIN` empty to allow any Gmail account, or set it (e.g. `yourco.com`) to restrict sign-in.
New people start as members with no team; an admin assigns a team and role.

## Notes and choices
- Weeks run Sunday to Saturday, dates in UTC.
- "Interviews" are 1:1 review meetings a manager schedules with a team member, with notes both can read.
- Members see their own progress; only managers and admins see the team chart.
- Entries lock when the week is submitted; a returned week can be edited and resubmitted.

## Deploy to Vercel
Two Vercel projects from this repo:

| Project | Root Directory |
|---|---|
| web | `apps/web` |
| api | `apps/api` (zero-config Express, entry `src/index.ts`) |

Database: Supabase Postgres. Set `DATABASE_URL` to the transaction pooler (port 6543) and `DIRECT_URL` to the session/direct URI (port 5432), then run `npm run db:migrate` once with those env vars.

Env vars
- web: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `API_URL` (the api project's URL), `API_JWT_SECRET`, optional `ALLOWED_EMAIL_DOMAIN`. Leave `AUTH_DEV_LOGIN` unset.
- api: `DATABASE_URL`, `DIRECT_URL`, `API_JWT_SECRET`, `ADMIN_EMAILS`.

Add `https://<your-web-domain>/api/auth/callback/google` to the Google OAuth redirect URIs.
