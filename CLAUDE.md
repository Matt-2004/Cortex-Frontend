# Cortex frontend

Cortex is RAG-as-a-service: an AI assistant a business embeds on its website.
It answers visitors' policy questions (shipping, returns…) from the business's
own documents, cites the source of every answer, and recommends products from
its catalog. This repo is the Next.js frontend: the marketing site, auth pages
and the signed-in console.

@AGENTS.md

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 (`@theme inline`
  tokens in `src/app/globals.css`), lucide-react, clsx, zod, next-auth 4 (Google).
- `next.config.ts`: `cacheComponents: true`, `partialPrefetching: true`.
- This Next version differs from older docs: read the guide in
  `node_modules/next/dist/docs/` before using an API you are unsure of.

## Commands

```bash
npm run dev            # dev server on :3000 (usually already running)
npx tsc --noEmit -p .  # type-check
npx eslint <paths>     # lint
npx prettier --write <paths>   # format (no config → defaults, 80 columns)
```

- No Jest config exists: the tests under `features/*/test` do not run yet.
- Format only the files you changed; don't run Prettier over whole folders.

## Layout

```
src/app/
  page.tsx                 marketing landing (/)
  auth/                    sign in, register, verify email, reset password
  console/                 signed-in area (sidebar shell)
    page.tsx               Overview
    organizations/…        list → [organizationId] → members/[memberId]
    knowledge/, chat/      knowledge base, test chat
  api/                     same-origin route handlers (backend-for-frontend)
    auth/*                 → Cortex backend /api/auth/*
    organizations/**       → Cortex backend /api/organizations/**
    ai/*                   → Cortex AI service (adds API key + tenant)
  features/<feature>/      api/ hooks/ server/ types/ ui/ utils/ test/
    landing/  auth/  console/  organizations/  ai/  toast/
    console/ = shell, shared console UI (consoleUi.tsx), useResource, Overview
  shared/                  apiClient, ApiError, useApiErrorHandler, types
```

## Data flow (do not bypass)

Browser → our `/api/*` route handlers → backend. The browser never calls the
backend or the AI service directly, and never holds tokens.

- Session lives in HttpOnly `cortex_*` cookies set by the backend.
- Server: `features/auth/server/backendClient.ts` — `backendFetch` (auth),
  `backendApiFetch` (everything else), `forwardCredentials`, `relay`,
  `withBackend`. Route handlers relay the backend's status and body unchanged.
- Browser: `apiRequest<T>(path, { method, body, signal, auth })` from
  `shared/utils/API/apiClient.ts`. `auth: true` refreshes the session once on 401.
  Every failure is an `ApiError`; handle it with `useApiErrorHandler()`
  (toasts, redirect to `/auth/login` on expired session, `fieldErrors`).
- AI calls use `features/ai/api/aiApi.ts` (`AiApiError`).
- Server-only modules start with `import "server-only"`. Secrets stay there.
- Env: `CORTEX_BACKEND_URL`, `CORTEX_AI_URL`, `CORTEX_AI_API_KEY`,
  `CORTEX_AI_TENANT_ID`, `AUTH_SECRET`, `GOOGLE_CLIENT_*`
  (see `.env.local.example`). Never print `.env.local` values.

## Backend API

Cortex.Api (ASP.NET). OpenAPI: `{CORTEX_BACKEND_URL}/openapi/v1.json`
(Scalar UI at `/scalar`). JSON is camelCase, dates are ISO 8601 UTC.

- Organizations: `GET/POST /api/organizations`, `GET/PUT …/{id}`,
  `GET/POST …/{id}/members`, `PUT/DELETE …/{id}/members/{memberUserId}`.
- Shapes live in `features/organizations/types/organization.types.ts`
  (`Organization` = `OrganizationDto`, `OrganizationMember` = `MemberDto`).
  There is no "get one member" endpoint: read the list.
- `OrganizationRole` is an integer: **0 Owner, 1 Admin, 2 Member**.
  `toRole()` also accepts names; `organizationsApi` normalises every response.

## Permissions (console)

Defined once in `organization.types.ts`; the backend must enforce the same rules.

- Owner: everything.
- Admin: manages admins and members; cannot change/remove owners or make
  anyone an owner (`canEditMember`, `assignableRoles`).
- Member: manages nothing. The Organizations tab is hidden when the user is a
  plain member in every organization (`useOrganizationAccess` in
  `ConsoleShell.tsx`); organization pages show a no-access state.

## Cache Components rules

- No `Date.now()`, `new Date()` or `Math.random()` in prerendered server code.
- Request data (`params`, cookies, `usePathname`, `useSearchParams`) must sit
  behind `<Suspense>`. Dynamic pages use
  `<Suspense fallback={<Skeleton/>}>{params.then(...)}</Suspense>`.
- Console screens wrap themselves in `<SignedIn fallback={…}>`, so nothing
  fetches before the session check in `ConsoleShell` finishes.

## Design system

Brand tokens (`globals.css`): `brand-ink #12172a` (text), `brand-teal #00ab8f`
(actions), `brand-wash #e4f5f1`, `brand-mist #f4f6f8`, `primary-50…900`
(`primary-700 #007362`). Fonts: Inter (body, brand), Newsreader
(`font-display`, headings), IBM Plex Mono (`font-receipt`, labels/numbers).

- Backgrounds: white and the teal wash only. **Navy is never a background**
  (text only). Auth pages are white.
- One action colour: teal button with navy text (`primaryButtonLook`).
- One primary button per action — never two buttons for the same thing.
- Progressive disclosure: forms open on demand (dialogs), not all at once.
- Lists are tables that keep their headers when empty (`EmptyTableRow`),
  with skeleton rows while loading (`SkeletonRows`).
- Avoid "AI-looking" UI (the user's `anti-ai-design` skill): no generic Lucide
  decoration (Sparkles, ArrowRight…), no equal-weight card grids, no glow, at
  most one eyebrow label per page. The brand rules above win over the skill.
- Copy: short, plain, says what the product does.

### Landing page (`features/landing/ui/`)

- Every section uses the shared `<Section>` (text left, one figure right) with
  a `tone` (`white` | `wash` | `teal`) and optional `pattern`. FAQ is the only
  full-width exception. Keep copy to a label, a short heading, ~one sentence.
- The hero headline names the product category (an AI assistant for your website).
- Visuals are coded mock-ups; pricing, the widget and its embed snippet are
  placeholders until the real ones exist.

### Console (`features/console/ui/`, `features/organizations/ui/`)

- `ConsoleShell`: left sidebar (drawer below `lg`), session check, `PageHeader`
  (wash band). Building blocks in `consoleUi.tsx`: `Panel`, `Field`, `Modal`
  (native `<dialog>`), `Notice`, `NoAccess`, `ErrorState`, `RoleBadge`,
  `SearchInput`, table styles, `Skeleton`, button classes, `SideNote`.
- A screen is one boxed `Panel` (the main table) plus unboxed `SideNote`s
  beside it for what supports it — not a grid of matching cards. Split the two
  with container queries (`@container`, `@4xl:`): the sidebar eats 256px.
- Overview: status ledger (rises into the header band), recent documents
  table, side notes. "Add content" appears once, in the header.
- Members: three tables (Owners, Admins, Members), read-only; roles are
  changed on the member page. "Add member" sits above the tables, top right.
- Organization tabs are deep-linkable (`?tab=settings`).

## Conventions

- Feature folders own their code; shared helpers go in `src/app/shared/`.
- Route handlers: thin, `withBackend(async () => relay(await backendApiFetch(…)))`.
- Comments explain *why*, not what. User-facing errors show the backend's own
  message (`ApiError.message`).
- Accessibility: semantic HTML, labels on every control, keyboard and focus
  states, `prefers-reduced-motion` respected (see `.console-row-in`).
- Commit or push only when asked.

## Verifying UI

- Type-check and lint the touched paths.
- Check pages in a real browser (headless Chrome works) at desktop and 390px
  width: no horizontal scroll, no console errors.
- Without backend credentials, mock `/api/*` in the browser (CDP Fetch
  interception); never create accounts or data on the real backend unasked.
- If the dev server reloads every page in a loop ("HMR hash mismatch"), it
  needs a restart; it is not an app bug.

## Known gaps

- The embeddable widget is not built yet; one fixed AI tenant
  (`CORTEX_AI_TENANT_ID`) until accounts map to tenants.
- `/api/ai/*` routes have no auth check yet.
- No Privacy/Terms/Contact pages; landing proof/testimonials are absent.
