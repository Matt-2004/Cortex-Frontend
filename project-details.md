# Cortex — Project Details

What the product is, what's built, how to run it, and what's next.
For how the parts connect, see [architecture.md](architecture.md).

## 1. Product

**Cortex** is RAG as a service for websites. Businesses connect their content, and Cortex gives
their site an AI assistant that:

| Capability | What visitors get |
|---|---|
| **Policy answering** | Answers about returns, shipping, accounts and so on, taken only from the business's uploaded documents and website pages, with citations. |
| **Recommendations** | Relevant products or pages, based on what the visitor asks and what they viewed. |

**Who uses what**

- **Business owners and admins** use the Cortex dashboard to sign up, upload knowledge and test
  the assistant.
- **Website visitors** talk to the embedded assistant (the widget isn't built yet).
- **Cortex platform admins** use the admin sign-in (the screen exists, but no route exposes it
  yet).

**Brand**

| | |
|---|---|
| Name | **Cortex** (the wordmark shows "Cortex" only) |
| Colours | Navy `#12172A` · Teal `#00AB8F` · Mist `#F4F6F8` |
| Font | Inter (via `next/font`) |
| Logo | `public/brand/cortex-cx-mark.svg` (for light backgrounds) and `cortex-cx-mark-on-dark.svg` |

## 2. Status

| Area | Status | Notes |
|---|---|---|
| Auth UI (sign in, register, forgot/reset password, verify email) | ✅ Built | Shared split layout, accessible forms, shake on invalid fields, live password checklist |
| Auth backend calls | 🟡 Demo mode | No backend URL yet; every action waits 2 s and returns a demo success |
| Google sign-in | ✅ Wired | Auth.js Google provider; needs `GOOGLE_CLIENT_ID/SECRET` |
| Dashboard: Knowledge base | ✅ Built | Upload files, add URL, paste text, list, delete |
| Dashboard: Chat | ✅ Built | Streaming answers, citations, recommendations toggle, stop, new chat |
| AI service | ✅ Built, runs locally | FastAPI + LangChain + Ollama + pgvector; tested end to end with real models |
| Recommender | ✅ Built | Catalog API plus recommendations; no catalog UI in the dashboard yet |
| Dashboard / proxy auth | ❌ Missing | `/dashboard` and `/api/ai/*` are open to anyone who can reach the app |
| Tenant per account | ❌ Missing | Fixed `demo` tenant for now |
| Embeddable visitor widget | ❌ Not started | |
| Automated tests | ❌ None runnable | Frontend test files exist but there's no Jest config; AI tests were removed |

## 3. Repositories

| Repo | Path | Contents |
|---|---|---|
| Frontend | `~/Desktop/Cortex-Frontend/my-app` | Next.js app (this repo) |
| AI service | `~/Desktop/RAG` | FastAPI service, `docker-compose.yaml` (pgvector), the original notebooks (`RAG.ipynb`, `RAG_own_version.ipynb`, `RAG.py`), sample PDF in `data/` |
| Backend | — | Separate; URL to be provided |

## 4. Tech stack

**Frontend**: Next.js 16.4.5 (App Router, `cacheComponents`), React 19.3, TypeScript 5,
Tailwind CSS v4, zod 4, Auth.js (next-auth 4) + Auth0 SDK, axios, lucide-react, `server-only`.

**AI service**: Python 3.13, FastAPI, uvicorn, Pydantic v2 + pydantic-settings, LangChain
(core, text splitters, Ollama), psycopg 3 + psycopg-pool + pgvector, pypdf, httpx, BeautifulSoup.

**Infrastructure**:
- PostgreSQL 17 + pgvector 0.8 (`pgvector/pgvector:pg17`).
- Ollama with `nomic-embed-text` (768-dim embeddings) and `qwen3.5:2b-mlx` (chat).

## 5. Running locally

### 5.1 Database (pgvector)

```bash
cd ~/Desktop/RAG && docker compose up -d
```

> ⚠️ A Homebrew Postgres 15 on this machine listens on `localhost:5432` and doesn't have
> pgvector. Either stop it (`brew services stop postgresql@15`) or map the container to another
> port and update `CORTEX_AI_DATABASE_URL`. During development, a container on port **55432** was
> used:
>
> ```bash
> docker run -d --name cortex-ai-live-pg -p 55432:5432 \
>   -e POSTGRES_DB=cortex -e POSTGRES_USER=cortex_admin -e POSTGRES_PASSWORD=cortex_dev_password \
>   pgvector/pgvector:pg17
> ```

### 5.2 Models

```bash
ollama pull nomic-embed-text
ollama pull qwen3.5:2b-mlx
ollama serve   # if the Ollama app isn't already running
```

### 5.3 AI service

```bash
cd ~/Desktop/RAG
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # set CORTEX_AI_API_KEY and CORTEX_AI_DATABASE_URL
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/health/ready`: it should report `"status": "ready"`.
API docs: `http://localhost:8000/docs`.

### 5.4 Frontend

```bash
cd ~/Desktop/Cortex-Frontend/my-app
npm install
cp .env.local.example .env.local   # fill in values (see below)
npm run dev
```

| URL | Page |
|---|---|
| `/auth/login`, `/auth/register` | Sign in / create account |
| `/auth/forgot-password` | Request a reset link |
| `/auth/reset-password?token=…` | Set a new password |
| `/auth/verify-email` | Resend the verification email |
| `/dashboard/knowledge` | Knowledge base |
| `/dashboard/chat` | Test chat |

Old auth URLs (`/auth/email/reset-password`, `/auth/password/reset`, `/auth/email/verification`)
redirect permanently to the new ones, and the query string is kept.

## 6. Configuration

### Frontend (`.env.local`, server-side unless prefixed `NEXT_PUBLIC_`)

| Variable | Purpose |
|---|---|
| `NEXT_Backend_URL` | Cortex backend base URL. **Empty means demo mode** for auth (2 s simulated responses). |
| `CORTEX_AI_URL` | AI service URL (default `http://localhost:8000`) |
| `CORTEX_AI_API_KEY` | Must match the AI service's `CORTEX_AI_API_KEY`. Never expose it to the browser. |
| `CORTEX_AI_TENANT_ID` | Temporary fixed tenant (`demo`) |
| `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Auth.js |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `AUTH0_*`, `APP_BASE_URL` | Auth0 SDK (comparison setup) |

### AI service (`~/Desktop/RAG/.env`, all prefixed `CORTEX_AI_`)

| Variable | Default | Purpose |
|---|---|---|
| `API_KEY` | *(empty: auth off, dev only)* | Shared secret for `X-API-Key` |
| `DATABASE_URL` | `postgresql://cortex_admin:…@localhost:5432/cortex` | pgvector database |
| `DB_SCHEMA` | `ai` | Postgres schema for the AI tables |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | |
| `LLM_MODEL` / `EMBED_MODEL` | `qwen3.5:2b-mlx` / `nomic-embed-text` | |
| `EMBED_DIMENSIONS` | `768` | Must match the embedding model |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `800` / `120` | Characters |
| `TOP_K` | `4` | Chunks retrieved per question |
| `MAX_COSINE_DISTANCE` | `0.45` | Relevance cutoff; above this, the LLM isn't called |
| `MIN_RECOMMENDATION_SCORE` | `0.35` | Needs calibration with real catalog data |
| `MAX_UPLOAD_MB` | `20` | |

## 7. Conventions

**Code organisation**

- **Frontend features** live in `src/app/features/<feature>/` (`ui/`, `hooks/`, `utils/`,
  `types/`, `api/`, `server/`). Shared UI is in `src/app/shared/ui/`.
- **AI service**: each file starts with a docstring explaining *what it does* and its
  *purpose*. Routes stay thin, logic lives in `services/`, and SQL lives in `repositories/`.

**Auth forms**

- They use `AuthSplitLayout` and the shared `Input`.
- Errors appear after the user leaves a field or submits.
- Invalid fields shake for 1 second (skipped when the system prefers reduced motion).
- Submit buttons stay enabled; a failed submit shows every error and focuses the first one.

**Password rules** (registration and reset only; never shown on sign-in): at least 8
characters, 1 uppercase letter, 1 symbol, max 20.

**Accessibility**

- `<main>` landmarks and one `<h1>` per page.
- Labelled forms, with errors linked to their fields.
- Keyboard focus rings (`@layer base` in `globals.css`).
- Status messages announced to screen readers.
- Respects `prefers-reduced-motion`.

**Secrets**: the AI API key only in server env; `server-only` guards the AI client.

## 8. Roadmap

1. **Protect the dashboard and `/api/ai/*`**: require a signed-in session (proxy or route checks).
2. **Connect the real backend**: set `NEXT_Backend_URL`; replace the fixed tenant with the
   account's site id from the session.
3. **Embeddable widget**: a script/iframe for customer sites, a public chat endpoint with
   per-site keys and rate limiting.
4. **Background ingestion**: a job queue plus status endpoint for large PDFs and multi-page crawls.
5. **Catalog management UI**: import products/pages and preview recommendations.
6. **Tests**: Jest config for the frontend; pytest for the AI service (against a pgvector test
   database).
7. **Calibration**: tune the relevance cutoff and recommendation threshold per tenant with real
   questions.
8. **Ops**: Dockerfiles for the frontend and AI service, Alembic migrations, monitoring, hosted
   model option.
