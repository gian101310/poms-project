# CLAUDE.md — start here

**Read [`HANDOFF.md`](./HANDOFF.md) first** — it is the current operational
handoff for this project. Read [`PROGRESS.md`](./PROGRESS.md) only if you need
older history.

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

When you finish a unit of work, update `HANDOFF.md` and, if it changes project
history, also update `PROGRESS.md`.
