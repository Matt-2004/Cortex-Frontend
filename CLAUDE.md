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

- Organizations: `GET/POST /api/organizations`, `GET/PUT …/{id}` (no delete),
  `GET …/{id}/members`, `PUT/DELETE …/{id}/members/{memberUserId}`.
- Invitations (the only way to add people): `GET/POST …/{id}/invitations`,
  `DELETE …/{id}/invitations/{invitationId}`, public
  `GET /api/invitations/preview?token=`, `POST /api/invitations/accept`.
- Shapes live in `features/organizations/types/organization.types.ts`
  (`Organization` = `OrganizationDto`, `OrganizationMember` = `MemberDto`).
  There is no "get one member" endpoint: read the list.
- `OrganizationRole` is a string enum in the spec (`"Owner"|"Admin"|"Member"`);
  the console uses integers **1 Owner, 2 Admin, 3 Member**. `toRole()` reads
  either, `toRoleName()` writes names; `organizationsApi` does both.

## Permissions (console)

Defined once in `organization.types.ts`; the backend must enforce the same rules.

- Owner: everything.
- Admin: manages admins and members; cannot change/remove owners or make
  anyone an owner (`canEditMember`, `assignableRoles`).
- Member: manages nothing. The Organizations tab is hidden when the user is a
  plain member in every organization (`useOrganizationAccess` in
  `ConsoleShell.tsx`). It shows at once, from the last visit's answer kept in
  `localStorage`, and doesn't wait for the backend; organization pages show a no-access state.

## Cache Components rules

- No `Date.now()`, `new Date()` or `Math.random()` in prerendered server code.
- Request data (`params`, cookies, `usePathname`, `useSearchParams`) must sit
  behind `<Suspense>`. Dynamic pages use
  `<Suspense fallback={<Skeleton/>}>{params.then(...)}</Suspense>`.
- Console screens wrap themselves in `<SignedIn fallback={…}>`, so nothing
  fetches before the session check in `ConsoleShell` finishes.

## Design system

Brand tokens (`globals.css`): `brand-ink #12172a` (text), `brand-teal #00ab8f`
(actions; the logo's centre dot), `brand-wash #f3f4f6` (neutral band),
`brand-mist #f4f6f8`, `primary-50…900`
(`primary-700 #007362`). Fonts: Inter (body, brand), Roboto
(`font-display`, headings), IBM Plex Mono (`font-receipt`, labels/numbers).

- Colour: neutral surfaces (white and the grey wash) with the logo teal as the
  only accent, for what acts or highlights. The landing page's closing band
  (`primary-700`) is the one coloured surface. **Navy is never a background**
  (text only). Auth pages are white.
- Text greys are tokens, never hex: `brand-ink-muted` (#4b5468, supporting
  copy), `brand-ink-subtle` (#6b7385, icons/hints), `brand-ink-faint`
  (#8b93a8, disabled/superseded). Headings use `font-heading` (bold, from
  `--heading-weight`). Any new repeated colour/size goes in `globals.css` as
  a variable, not as an arbitrary `[#hex]` value.
- Elevation: `shadow-float` / `shadow-float-raised` (`--elevation-*`). Landing
  demos have no frame box; their cards float on the section with `shadow-float`.
- Corners: four tokens in `:root` (`--corner-badge` 2px, `--corner-control`
  4px, `--corner-box` 6px, `--corner-card` 10px), used as `rounded-badge`,
  `rounded-control`, `rounded-box`, `rounded-card`. No arbitrary
  `rounded-[Npx]`; change a radius in `globals.css` only.
- Toasts (`features/toast`) are the exception to the teal-only rule: a light
  status tint, coloured icon and dark text (`--status-<name>-bg|-border|-text`
  and `--status-<name>` for the icon; classes `bg-status-success-bg` etc.).
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
  a `tone` (`white` | `wash` | `teal`) and optional `pattern`. FAQ and Pricing are the
  full-width exceptions (Pricing: three plan columns, the featured one
  teal-bordered with the only teal button). Keep copy to a label, a short heading, ~one sentence.
- The hero headline names the product category in 8 words or fewer ("An AI
  assistant for your website"); the first screen carries one hard fact.
- From `lg`, each section fills the screen under the header (capped at 780px).
  The header holds only Console and Start free (no section links, no Sign in).
- Motion: section text and frame rise in, staggered, once, on scroll
  (`Reveal`); curves are `--ease-settle` (arrivals) and `--ease-travel`
  (things that move), no overshoot.
- Visuals are demos, not stills (`demos.tsx`, `useTimeline`): each waits empty
  off screen, plays once when 40% in view, rests on its last frame. No Replay
  button, no duration bar; a demo plays once per visit and never loops. Every section demo runs 2.5s (its `*_STEPS` add up to 2500) (only the hero shows progress, by filling its example buttons). Motion shows what happens: typing dots then
  streamed words, a pointer that clicks, labels that cross-fade. Parts stay in the layout and only fade, slide or
  draw (`.demo-*` in `globals.css`), so frames never resize. Reduced motion
  and no-JS show the last frame. Pricing, the widget and its embed snippet
  are placeholders until the real ones exist.

### Console (`features/console/ui/`, `features/organizations/ui/`)

- Compact, because it is an information tool: 36px controls (`h-9`), ~40px
  table rows, sans-serif `text-xl/2xl` page titles (no `font-display`),
  `py-6` page body. Don't add big headings or roomy padding.
- Colour has one meaning each (see the header of `consoleUi.tsx`): teal =
  action and brand (primary button, links, focus, Owner); blue = info
  (Admin, notices); green = done/healthy; amber = needs attention; red =
  destructive/failed; grey = the rest. Status colours come from the
  `--status-*` tokens. The `.console-theme` scope re-points the tinted teal
  steps (`primary-50/100/200/800/900`) to greys, so for a real teal tint use
  `brand-teal/10`.
- All badges are `Badge` with a `tone` (`RoleBadge`, billing status). All
  notes are `Notice` with a `tone`. Don't hand-roll coloured pills.
- `ConsoleShell`: left sidebar (drawer below `lg`), session check, `PageHeader`
  (wash band). Building blocks in `consoleUi.tsx`: `Panel`, `PanelHeader`
  (title + count left, search/filters/actions right), `DetailList` /
  `DetailRow` (label-left facts), `CopyValue`, `Field`, `Modal` (native
  `<dialog>`), `Notice`, `NoAccess`, `ErrorState`, `Badge`, `RoleBadge`,
  `SearchInput`, table styles, `Skeleton`, button classes (`buttonGhost` for
  row actions).
- The console canvas is pale grey (`brand-wash`); content sits on white
  `Panel`s. A list screen is one `Panel` whose `PanelHeader` holds its
  title, count, filters and main action; forms and detail pages are a
  single `max-w-3xl` column of panels.
- Overview: one purpose — can the assistant answer, and from what. Title
  "Overview" with a one-line status, two plain stat cards (Documents, Last
  added), then the "Recent documents" table (Name, Type, Added). A setup
  checklist shows above them only until setup is done. "Add content" appears
  once, in the header.
- Organizations: one full-width table of every organization the user belongs
  to (Organization, Members, Your role, Created). Managed ones link and show
  a member count (one members request per row, first 12); member-only ones
  are unlinked and say "View only".
- Organization page: compact header (logo, name, slug, "You are <role>"),
  then tabs. Breadcrumbs come from `OrganizationBreadcrumb`.
- Members: one read-only table (#, Name, Email, ID, Role, Joined, edit/view
  icon) ranked Owner → Admin → Member (then by name); search and role filter
  (All roles, Owner, Admin, Member) sit in its `PanelHeader`. Roles are
  changed on the member page (Details, Role, Remove/Leave).
- Invitations tab (owners and admins only, `manageOnly` in `TABS`): one
  table with "Invite member" in its header; Revoke per row.
- Organization tabs are deep-linkable (`?tab=invitations`, `?tab=settings`).

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
