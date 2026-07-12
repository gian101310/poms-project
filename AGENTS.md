# AGENTS.md — start here

**Read [`HANDOFF.md`](./HANDOFF.md) first** — the current operational handoff
for this project. Read [`PROGRESS.md`](./PROGRESS.md) only if you need older
history. Update the handoff when you finish work.

Quick facts:
- Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Vercel.
- Setup: `npm install && npm run dev` → http://localhost:3000. Requires
  `.env.local` (Supabase URL + anon + service_role, `CRON_SECRET`, `SETUP_SECRET`).
- DB: `xlvsxxiyeucvtiksvvgp` (work Supabase). Timezone Asia/Dubai.
- Schema changes: run SQL in the Supabase SQL editor; migrations in
  `supabase/migrations/` are applied in numeric order (API key can't run DDL).
- Audit tables are append-only (no UPDATE/DELETE). The generate cron only builds
  checklists for `status='scheduled'` schedule rows.
- Validate with `npx tsc --noEmit` and `npx next build` before pushing.
  Push to `main` auto-deploys on Vercel.
