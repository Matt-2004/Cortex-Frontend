# Cortex frontend

[![CI](https://github.com/Matt-2004/Cortex-Frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Matt-2004/Cortex-Frontend/actions/workflows/ci.yml)

Cortex is an AI assistant a business embeds on its website. It answers
visitors' questions (shipping, returns…) from the business's own documents,
cites the source of every answer, and recommends products from its catalog.

This repo is the Next.js frontend: the marketing site, the auth pages and the
signed-in console.

## Stack

Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS
v4, next-auth 4 (Google), zod, lucide-react.

## Run locally

Requires Node 24.

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev                        # http://localhost:3000
```

| Variable                                                    | Used for                            |
| ----------------------------------------------------------- | ----------------------------------- |
| `CORTEX_BACKEND_URL`                                        | Cortex API (auth, organizations)    |
| `CORTEX_AI_URL`, `CORTEX_AI_API_KEY`, `CORTEX_AI_TENANT_ID` | Cortex AI service (knowledge, chat) |
| `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`   | Google sign-in                      |

All of these are server-only. The browser talks to this app's `/api/*` route
handlers, which call the backend; it never calls the backend directly or holds
tokens (the session lives in HttpOnly cookies).

## Scripts

| Command                       | What it does                             |
| ----------------------------- | ---------------------------------------- |
| `npm run dev`                 | Dev server on port 3000                  |
| `npm run build` / `npm start` | Production build and server              |
| `npm run typecheck`           | TypeScript, no output                    |
| `npm run lint`                | ESLint over the repo                     |
| `npm run check`               | Type-check, lint and build: what CI runs |

## Project layout

```
src/app/
  page.tsx            marketing landing (/)
  auth/               sign in, register, verify email, reset password
  console/            signed-in area: overview, organizations, knowledge, chat
  api/                route handlers that forward to the backend
  features/<name>/    api/ hooks/ server/ types/ ui/ utils/ per feature
  shared/             API client, errors, shared types
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push to any branch and on every pull
request into `main`. It installs from the lockfile, then type-checks, lints and
builds the app without any secrets. If one step fails, the run fails.

To stop broken code reaching `main`, a repo admin should turn on branch
protection: **Settings → Branches → Add rule for `main` → Require status
checks to pass**, and pick **Type-check, lint, build**.

Run `npm run check` before pushing to catch the same failures locally.

The test files under `features/*/test` are not wired up yet (there is no Jest
config), so CI does not run them.
