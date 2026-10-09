# Working on this repo

Read [README.md](README.md) for the architecture. This file is the things that
will otherwise cost you an hour.

## Pull before you plan

This repo moves in large PR batches. A stale checkout will have you reasoning
about an architecture that no longer exists — run `git fetch && git status`
first. In particular: **Payload CMS was removed entirely.** There is no
`/admin`, no `payload.config.ts`, no `payload-types.ts`, and no
`payload generate:types`. The admin is a custom app at `/studio` and the site
reads Postgres directly through `src/db`. Any document, comment or memory
describing Payload is out of date.

## The database is production

`DATABASE_URL` points at the shared Supabase Postgres. There is no local
seed and no staging copy, so `pnpm dev` reads and writes **live business
data** — real leads, real published content. Prefer read-only exploration;
when you must write, use clearly-labelled test records and delete them.

Schema changes are hand-written SQL in `db/migrations/`, applied manually.
There is no migration runner, so do not expect `pnpm` to apply anything.

## SEO is load-bearing

The site was migrated from WordPress with every legacy URL, `<title>` and
`<h1>` preserved verbatim, and it ranks on them. **Do not change titles, H1s
or slugs** as a side effect of other work. If a change genuinely needs one,
call it out and let the owner decide.

Corollary: retired URLs must keep 301ing. `redirects.ts` is the map; adding a
route that shadows a redirect silently breaks it.

## Gotchas

- **Stale `.next` breaks typecheck.** After pulling across a big refactor,
  `pnpm typecheck` can fail with `Cannot find module '…/src/app/(payload)/…'` —
  those come from route types cached in `.next`, not from your code. Delete
  `.next` and `tsconfig.tsbuildinfo` and re-run.
- **ESLint uses native flat configs.** `eslint-config-next` 16 exports them
  directly. Do not route them through `FlatCompat` — the eslintrc bridge tries
  to JSON-serialize plugin objects that contain cycles and dies with
  "Converting circular structure to JSON".
- **`next/image` rejects local paths that aren't allowlisted.** Anything you
  pass must match an entry in `images.localPatterns` (or `remotePatterns`) in
  `next.config.ts`, or the optimizer returns 400 and the image just fails.
- **A city's combo token keeps the `-ca` suffix.** `cityToken()` in
  `src/lib/service-city.ts` only strips the `electrician-` prefix, so the
  token for `electrician-burbank-ca` is `burbank-ca`. Keying a lookup on
  `burbank` silently matches nothing.
- **`cities.region` is NULL for every row.** Geographic grouping lives in
  `src/lib/city-regions.ts`, not the database. A non-null `region` overrides it.
- **`PAYLOAD_SECRET` is the session signing key** (and encrypts stored OAuth
  tokens), despite the name. Rotating it signs every admin out.
- **`pnpm`, not npm.** Windows dev machine; `pnpm install --ignore-workspace`.

## Before you hand work back

`pnpm lint && pnpm typecheck && pnpm test` — all three run in CI. There are no
end-to-end tests, so anything touching the lead forms or Studio auth needs a
manual pass; [HANDOFF-LIVE-QA.md](HANDOFF-LIVE-QA.md) is the checklist.
