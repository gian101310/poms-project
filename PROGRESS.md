# POMS — Progress & Handoff

> Read this first. It is the shared status doc for every agent working on POMS
> (Claude on Mac, Claude on Windows, Codex, etc.). Keep it up to date: when you
> finish something, move it from "In progress / next" to "Done" with a date.

**What it is:** Pet Store Operations Management System — daily checklists,
attendance, animal welfare, handovers, incidents, memos, inspections, audit trail.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + RLS) · Vercel
**Live:** deploys automatically from `main` on Vercel.
**DB:** `xlvsxxiyeucvtiksvvgp.supabase.co` (work Supabase account). **Timezone:** Asia/Dubai.

---

## How to start (local dev)

1. `git clone` the repo, then `npm install`.
2. Create `.env.local` (NOT committed) with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xlvsxxiyeucvtiksvvgp.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key — server only, secret>
   CRON_SECRET=<random>
   SETUP_SECRET=<random>
   ```
   Keys come from the work Supabase project → Settings → API. Ask Boss-G.
3. `npm run dev` → http://localhost:3000
4. Log in at `/login` with an Employee ID + password (admin is `ADMIN001`).

**Requirements:** Node 20+ (Mac dev uses Node 26), npm. That's it.

---

## Access & environment notes (important)

- The work Supabase account is often **not** wired into the AI connector, so
  schema (DDL) changes usually **can't** be pushed through the API key. Apply new
  migrations by pasting the SQL into the **Supabase SQL editor** (dashboard) and
  running it. Migrations live in `supabase/migrations/` — apply in numeric order.
- Server-side admin ops (create employee, crons, bulk data) use the
  **service_role** key via `lib/supabase/admin.ts`. Never expose it client-side.
- Audit tables are **append-only** (`login_sessions`, `task_events`, `audit_log`,
  `welfare_records`, `attendance_records`) — they reject UPDATE/DELETE. You can't
  hard-delete a profile that has login/attendance history; deactivate instead.
- The daily generator (`/api/cron/generate`) only builds checklists for schedule
  rows with `status = 'scheduled'`. `leave` / `off` days are skipped automatically.
- On the Mac: open the **work Supabase dashboard in Chrome Profile 2 (R3tail)**;
  the POMS app runs in Chrome **Default**. (Local convenience only.)

---

## Done

- **2026-07-12** Environment set up on Mac; repo cloned; build + Supabase verified.
- **2026-07-12** Cleared test staff (kept `ADMIN001`). Created 11 real staff
  (`EMP001`–`EMP011`), rostered 60 days onto Morning (08:00–18:00) /
  Afternoon (13:00–22:00). Passwords delivered to Boss-G out of band.
- **2026-07-12** `009_sections.sql`: added `sections` table (dept→section
  hierarchy) with RLS; normalized 7 parent departments (Dogs, Cats, Small
  Animals, Birds, Pharmacy, Kennel, Grooming); retired the old flat granular
  departments; seeded 66 sections from a Pet World baseline.
- **2026-07-12** Admin UI: `Admin → Departments` now edits departments **and**
  sections (add/rename/activate/delete). `Admin → Employees` has a **Leave**
  button (date range → leave / off / back-on-roster).
- **2026-07-12** Auto-generated **20 premium checklist templates** (10 depts ×
  Morning/Afternoon, 204 tasks) focused on cleanliness/organization/stocking.
  `lib/default-checklists.ts` updated (added Pharmacy + Kennel). Edit in
  `Admin → Templates`.
- **2026-07-12** **Boarding & Kennel tab** (`/boarding`, all staff): `010_boarding.sql`
  (`boarding_stays` + `boarding_pets`, RLS = any active staff read/write). Intake
  form: owner/contact/email, check-in/out, paid/unpaid/partial + amount, items
  brought (cage/food/toys/bags/other), multi-pet with hardcoded taxonomy
  (`lib/pet-taxonomy.ts`: type → breed → color + description). List + check-out +
  mark-paid.
- **2026-07-12** Checklist **"Can't complete"** action live on staff task cards:
  requires a short reason, keeps the task open, writes `blocked` +
  `blocked_reason`, clears when the task is completed, and surfaces blocked
  counts/reasons in Command Center.
- **2026-07-12** **Cashier Cash Report** (`/cashier`, all active staff): opening /
  shift-change / closing form for float, cash drop, card sales, tips, expenses,
  and notes. Daily totals now surface on Command Center for managers/owners/admins.

## In progress / next

- **Assign departments to the 11 staff** (`Admin → Employees`) so checklists
  generate. Not done yet.
- **Accountability form** (later phase): on first portal open, staff accept
  responsibility for assigned areas + general policies before proceeding.

---

## File map (where things live)

- `app/(app)/` — authenticated pages (staff + admin). `admin/` = super-admin only.
- `app/(app)/admin/departments/` — dept + section management (page/actions/forms).
- `app/(app)/admin/employees/` — employee CRUD + leave (forms) → `app/api/admin/employees/route.ts`.
- `app/(app)/cashier/` — cashier cash report form/history; totals shown on `/overview`.
- `app/api/cron/{generate,overdue,attendance,eod}/route.ts` — scheduled jobs.
- `lib/supabase/{server,admin}.ts` — RLS client vs service-role client.
- `lib/{cron,tz,session,default-checklists}.ts` — helpers.
- `supabase/migrations/*.sql` — schema, applied in order via the SQL editor.

## Conventions

- Server actions for admin mutations (`"use server"`), client modals for forms.
- UI atoms in `components/ui.tsx` (`PageHeader`, `Badge`, `Table`, `card`/`btn-*`
  Tailwind classes). Keep styling consistent with those.
- Additive, surgical changes. Run `npx tsc --noEmit` and `npx next build` before push.
