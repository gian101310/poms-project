# CLAUDE.md — start here

**Read [`PROGRESS.md`](./PROGRESS.md) first** — it's the shared, always-current
status + handoff doc (what's done, what's next, how to run it, gotchas).

Quick facts:
- Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Vercel.
- `npm install && npm run dev` → http://localhost:3000. Needs `.env.local`
  (Supabase URL + anon + service_role, `CRON_SECRET`, `SETUP_SECRET`).
- DB: `xlvsxxiyeucvtiksvvgp` (work Supabase). Timezone Asia/Dubai.
- Schema changes: paste SQL into the Supabase SQL editor (migrations in
  `supabase/migrations/`, applied in order). The API key usually can't run DDL.
- Audit tables are append-only (no UPDATE/DELETE). The generate cron only builds
  checklists for `status='scheduled'` schedule rows.
- Before pushing: `npx tsc --noEmit` + `npx next build`. Push to `main` = deploy.

When you finish a unit of work, update the "Done" / "In progress" sections in
`PROGRESS.md`.
