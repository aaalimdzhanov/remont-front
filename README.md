# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
# remont-front

## Backend integration (Nuxt ↔ Go API ↔ PostgreSQL)

The 2D/3D Builder persists projects (name/status/Building JSON) to a
separate Go + PostgreSQL backend ([remont-back](../remont-back)). See that
repo's own README for backend setup. Quick start for local development:

```bash
# 1. Backend: PostgreSQL + API (from the remont-back checkout)
docker compose up -d
export $(cat .env.example | xargs)
go run ./cmd/api            # http://localhost:8080, runs migrations automatically

# 2. Frontend (this repo)
cp .env.example .env        # NUXT_PUBLIC_API_BASE_URL=http://localhost:8080
npm install
npm run dev                 # http://localhost:3000
```

`NUXT_PUBLIC_API_BASE_URL` (Nuxt public runtime config, `nuxt.config.ts`) is
the only place the backend URL is configured — never hardcoded in
components/composables. Override it per environment (dev/production) via
the env var.

### API used by the frontend

`app/api/client.ts` (transport + error normalization) and `app/api/projects.ts`
(typed methods) wrap:

| Method | Endpoint | Used by |
|---|---|---|
| GET | `/api/v1/projects` | project list panel |
| GET | `/api/v1/projects/{id}` | Open project, and hard-refresh restore via `/projects/{id}` |
| POST | `/api/v1/projects` | Save when no project exists yet (create-flow) |
| PUT | `/api/v1/projects/{id}` | Save / autosave (existing project) |
| DELETE | `/api/v1/projects/{id}` | Delete project |

### Persistence workflow

`app/composables/useProjectPersistence.ts` owns the whole project lifecycle
(create/load/save/delete), autosave, and save status. `useBuilding.ts` only
exposes a raw `documentRevision` counter (incremented by every mutator) —
it has no notion of "saved"/"dirty" itself; that's derived entirely in the
persistence layer by comparing `documentRevision` against the revision that
was last confirmed persisted (`savedRevision`). Building JSON itself always
lives only in `useBuilding()`'s `document`, never duplicated or deep-cloned
except once, right when an actual save request is about to fire.

- **Autosave**: every mutation schedules a debounced save (`AUTOSAVE_DEBOUNCE_MS`,
  1200ms) only if a canonical `projectId` already exists; autosave never
  creates a project. Rapid mutations (drag/resize) collapse into a single
  request once the user stops. A single `AUTOSAVE_ENABLED` constant turns it
  off entirely for debugging.
- **Save pipeline**: one function, `requestSave(reason: 'manual' | 'autosave')`,
  used by both the Save button and autosave. It cancels any pending debounce,
  refuses a second concurrent request (queuing a follow-up instead), and
  captures a JSON snapshot + the current revision only at the moment the
  request actually fires — so mutations made while the request is in flight
  are never lost and never silently overwritten by a stale response.
- **Save status** (`saveStatus`: `'saved' | 'unsaved' | 'saving' | 'error'`)
  drives the indicator in `BuilderProjectManager.vue` (✓ Сохранено /
  ⟳ Сохранение… / • Есть несохранённые изменения / ⚠ Ошибка сохранения). A
  failed save never clears dirty state or resets the Building JSON — the
  Save button becomes "Повторить сохранение" and a retry reuses the exact
  same pipeline.
- **New/Open/Delete** each invalidate any pending autosave/in-flight save for
  the project being left, so a stale request can never write to the wrong
  (or already-deleted) project id. The current project id is reflected in
  the URL (`/projects/{id}`, via `app/pages/projects/[id].vue`) purely so a
  hard browser refresh can restore it — no other routing changes.
- The editor keeps working fully offline (2D/3D/Geometry Engine/calculations)
  if the backend is unreachable — only Save/Load/list operations show an
  error, and a `beforeunload` warning appears only when there are actually
  unsaved changes.

Run frontend tests (API client + persistence/autosave/dirty-state) with:

```bash
npm run test
```

## Authentication (passwordless, phone + SMS)

The backend now requires auth on every `/api/v1/projects*` route. Frontend
pieces:

- `app/api/auth.ts` — typed methods for `/api/v1/auth/*`.
- `app/composables/useAuth.ts` — the single source of truth for auth state
  (`user`, `accessToken`, `isAuthenticated`, `isInitialized`, `error`).
- `app/middleware/auth.ts` / `guest.ts` — route guards for `/projects/**`
  and `/auth/**` respectively.
- `app/pages/auth/login.vue`, `register.vue` — phone → SMS code → session.

**Access token**: kept only in memory (`app/api/client.ts`'s `accessToken`
ref) — never `localStorage`/`sessionStorage`. It's gone after a hard reload
by design; the app recovers it via `POST /api/v1/auth/refresh`, which relies
on the HttpOnly `refresh_token` cookie the backend sets (never readable
from JavaScript).

**401 handling**: `apiFetch()` in `client.ts` catches a 401, triggers a
single-flight refresh (concurrent 401s share one `POST /auth/refresh`, never
several), and retries the original request exactly once. If refresh also
fails, the token is cleared and the registered auth-failure listener fires
(`useAuth` clears `user`).

**SSR note**: session restore needs the refresh cookie, which this
architecture does not forward into SSR requests. `nuxt.config.ts` sets
`routeRules: { '/', '/auth/**', '/projects/**': { ssr: false } }` for exactly
this reason — session/auth-dependent routes render client-only, avoiding a
SSR-then-client-redirect hydration mismatch. `app.vue` shows a splash until
`useAuth().initialize()` resolves (refresh → `/me`), so no page ever flashes
the wrong state.

For local dev, fetch the SMS code without a real provider via the backend's
dev-only endpoint: `GET /api/v1/dev/sms/last-code?phone=<phone>` (only
registered when the backend runs with `APP_ENV=development`).

## Design System (REMONT Design System v1)

All colors/spacing/radius/shadows/typography live as CSS custom properties
in `app/assets/css/main.css` (loaded globally via `nuxt.config.ts`'s `css`
array) — components consume `var(--color-primary)` etc. and the shared
`.btn`/`.input`/`.card`/`.tool-btn` utility classes instead of repeating hex
values. Font is Inter (400/500/600), loaded via Google Fonts in
`nuxt.config.ts`'s `app.head`.

- `app/layouts/auth.vue` — minimal centered shell for `/auth/login|register`.
- `app/layouts/app.vue` + `app/components/app/AppHeader.vue` — shared shell
  for `/projects`, `/projects/new` (not used by the editor, which renders
  its own `EditorHeader`).
- `app/components/ui/Icon.vue` — the app's entire icon system: one small
  registry of inline SVG paths, one stroke style, no external icon library.
- `app/components/ui/ConfirmDialog.vue` — reusable delete-confirmation modal.

Nuxt auto-registers components with a directory-based prefix (e.g.
`components/ui/Icon.vue` → `<UiIcon>`, `components/app/AppHeader.vue` →
`<AppHeader>` — no double prefix when the filename already starts with the
directory name). Keep that in mind before adding new shared components.
