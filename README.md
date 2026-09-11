# VIAX Catalog UI

A small Next.js app to **browse the VIAX catalog** — courses and programs fetched live from the
VIAX GraphQL API, shown as tiles with pagination and per-item detail pages. Read-only.

## How it talks to VIAX

[`src/server/viax.ts`](src/server/viax.ts) mirrors the `@viax/core` access pattern used by the
`functions-dev` functions:

- **Auth** — Keycloak client-credentials token from `IAM_URL` using
  `VAULT_SERVICE_CUSTOMER_CLIENT_ID/SECRET` (cached in memory).
- **Query** — Relay-style `filterTwouCourse` / `filterTwouProgram(_filter, _first, _after)`
  connections against `API_GW_URL`, with `totalCount` + `pageInfo` for cursor pagination.
- Default filter is `tCatalogActive = true`; `maId` is sanitised before use in `_filter`.

## Run it

```bash
npm install
cp .env.local.example .env.local   # fill in the VIAX values
npm run dev                        # http://localhost:3000
```

## Pages

- `/` — dashboard: live course/program totals from VIAX.
- `/courses`, `/programs` — tile grid with Prev/Next pagination.
- `/courses/[id]`, `/programs/[id]` — full detail (description, instructors, schools, program courses, raw JSON).

## API

- `GET /api/viax/courses`, `GET /api/viax/programs` — paged list (`?after`, `?first`).
- `GET /api/viax/courses/[id]`, `GET /api/viax/programs/[id]` — single item detail.
