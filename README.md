# POMS — Pet Store Operations Management System

Production system for daily pet-store operations: checklists, attendance,
animal welfare, handovers, incidents, memos, inspections, analytics, audit trail.

**Stack:** Next.js 14 · TypeScript · Tailwind · Supabase (Postgres + RLS) · Vercel
**Database:** `xlvsxxiyeucvtiksvvgp.supabase.co` (work account — this project is pinned to it)
**Timezone:** Asia/Dubai

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Supabase project URL (already set) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | Publishable key (already set) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Secret key — employee creation, crons. Paste into `.env.local` and Vercel yourself. |
| `CRON_SECRET` | server | Protects `/api/cron/*` (must match in Vercel) |
| `SETUP_SECRET` | server | One-time first-admin bootstrap |

## First-run checklist

1. `npm install && npm run dev`
2. Paste `SUPABASE_SERVICE_ROLE_KEY` into `.env.local`
3. Create the first Super Admin (one-time; only works while no profiles exist):
   ```
   curl -X POST http://localhost:3000/api/setup -H "Content-Type: application/json" ^
     -d "{\"secret\":\"<SETUP_SECRET>\",\"employee_code\":\"ADMIN001\",\"full_name\":\"Your Name\",\"password\":\"<strong password>\"}"
   ```
4. Log in at `/login` with `ADMIN001` + password
5. Admin → Employees: create supervisors/staff (each gets Employee ID + password)
6. Admin → Checklist Templates: build one per department + shift, add tasks
7. Admin → Shifts & Schedules: assign employees to shifts by date range
8. Next morning 00:05 Dubai the cron generates everyone's checklist automatically

## Cron jobs (vercel.json, UTC)

| Job | UTC | Dubai | Does |
|---|---|---|---|
| generate | 20:05 | 00:05 | Builds today's checklist instances from schedules + active templates |
| overdue | every 30m, 03–18 | 07–22 | Flags unfinished tasks after shift end, notifies staff + supervisors |
| attendance | 19:50 | 23:50 | Late/early/OT calc, absent detection, closes stale login sessions |

Trigger manually: `GET /api/cron/<name>` with header `Authorization: Bearer <CRON_SECRET>`

## Architecture notes

- All reads/writes from pages use the user's RLS-scoped Supabase session — staff physically cannot query other employees' data.
- Service role is used ONLY in `app/api/**` and server actions that need elevation (account creation, cron generation, notifications).
- History is append-only at the DB level: `task_events`, `audit_log`, `welfare_records` reject UPDATE/DELETE; `login_sessions` rejects DELETE. Task status transitions are validated by a Postgres trigger (staff can't self-verify).
- DB migrations live in `supabase/migrations/` — apply via the Supabase SQL editor in order.
