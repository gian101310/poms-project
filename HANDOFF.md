# POMS Handoff — Read This First

Last updated: 2026-07-13, Asia/Dubai.

This is the current handoff for POMS, the Pet Store Operations Management System.
Use this file before changing code. It explains where to start, what has already
been done, what migrations are expected live, and the important gotchas.

## Project State

- Local repo: `/Users/gianfx/poms-project`
- GitHub: `gian101310/poms-project`
- Production: https://poms-chi.vercel.app
- Current production branch: `main`
- Latest app feature commit at handoff time: `b9a0be4 Expand cashier handover reporting`
- Stack: Next.js 14 App Router, TypeScript, Tailwind, Supabase, Vercel
- Supabase project ref: `xlvsxxiyeucvtiksvvgp`
- Timezone: `Asia/Dubai`
- Push to `main` auto-deploys to Vercel.

## How To Start

1. Open `/Users/gianfx/poms-project`.
2. Read `HANDOFF.md`, then `PROGRESS.md` if more older context is needed.
3. Check local status:
   ```bash
   git status --short
   git log --oneline -5
   ```
4. For code changes, run:
   ```bash
   npm run build
   ```
5. Push to deploy:
   ```bash
   git push origin main
   ```
6. Verify deploy:
   ```bash
   npx vercel inspect https://poms-chi.vercel.app --timeout 180000
   ```

## Supabase Rule

The Supabase connector usually cannot run DDL migrations. When schema changes are
needed, paste the full SQL directly into Supabase SQL Editor and run it there.
When giving the user SQL, paste one clean ready-to-copy SQL block with no extra
text inside the block.

All migrations through `017_cashier_handover_variance.sql` have been applied
successfully at handoff time.

Applied migrations:

- `001_schema.sql`
- `002_rls.sql`
- `003_triggers.sql`
- `004_seed.sql`
- `005_shifts_attendance.sql`
- `006_geofence.sql`
- `007_followups_qr.sql`
- `008_kiosk.sql`
- `009_sections.sql`
- `010_boarding.sql`
- `011_cashier_and_blocked.sql`
- `012_branches_sections_branding.sql`
- `013_one_time_qr_breaks.sql`
- `014_clean_archived_seed_departments.sql`
- `015_staff_delivery_runs.sql`
- `016_grooming_bookings.sql`
- `017_cashier_handover_variance.sql`

Live DB checks already confirmed:

- `qr_tokens`: ok
- `break_sessions`: ok
- `staff_delivery_runs`: ok
- `grooming_bookings`: ok
- expanded `cash_reports` columns: ok
- departments: 60 total, 60 active, 0 inactive, 0 exact active duplicates, 0 archived codes

## Main Features Added Recently

### One-Time QR Login And Breaks

Files:

- `lib/one-time-qr.ts`
- `app/api/kiosk/qr/route.ts`
- `app/kiosk/page.tsx`
- `app/kiosk/kiosk-client.tsx`
- `app/api/auth/geocheck/route.ts`
- `app/(app)/break/page.tsx`
- `app/(app)/break/actions.ts`
- `app/(app)/break/break-client.tsx`
- `supabase/migrations/013_one_time_qr_breaks.sql`

Behavior:

- Kiosk QR is one-time and short-lived.
- Before 1pm it is a login QR.
- After 1pm it becomes a break QR.
- Staff scan current shop QR; old screenshots should fail.
- Break start/end requires active device session, QR token, and geofence.
- Break status appears in Command Center and Attendance.

### Branches, Departments, Sections

Files:

- `app/(app)/admin/branches/`
- `app/(app)/admin/departments/`
- `app/(app)/admin/employees/`
- `components/branch-filter.tsx`
- `supabase/migrations/012_branches_sections_branding.sql`
- `supabase/migrations/014_clean_archived_seed_departments.sql`

Live branches:

- Springs Souk
- Meadows Village
- Discovery Garden
- Festival Plaza

Important:

- Departments are repeated once per branch on purpose. This is not duplication.
- The Employees page now has a branch filter.
- Departments/sections forms are branch-scoped when a branch is selected.
- Warehouse and Cashier have no sections.
- Archived old departments were deleted after dependent test rows were removed.

### Command Center Staff Board

Files:

- `app/(app)/overview/page.tsx`
- `app/(app)/overview/actions.ts`
- `app/(app)/overview/overview-actions-ui.tsx`
- `supabase/migrations/015_staff_delivery_runs.sql`

Behavior:

- Shows per-staff task progress, unfinished tasks, attendance, branch, shift,
  active break, delivery status, absent/on-leave, upcoming leave, grooming
  summary, cash summary, and department drilldown.
- Delivery button toggles staff out/returned for delivery.
- Branch filter auto-applies without a Go button.

### Branch Filters

Files:

- `components/branch-filter.tsx`
- `app/(app)/overview/page.tsx`
- `app/(app)/analytics/page.tsx`
- `app/(app)/attendance/page.tsx`
- `app/(app)/grooming/page.tsx`
- `app/(app)/cashier/page.tsx`
- `app/(app)/reports/page.tsx`
- `app/(app)/admin/employees/page.tsx`

Behavior:

- Dropdown auto-submits on branch/date change.
- No Go button.
- Default is All branches.

### Grooming Workflow

Files:

- `app/(app)/grooming/page.tsx`
- `app/(app)/grooming/actions.ts`
- `app/(app)/grooming/grooming-client.tsx`
- `app/(app)/dashboard/page.tsx`
- `components/shell.tsx`
- `supabase/migrations/016_grooming_bookings.sql`

Behavior:

- Grooming page link: https://poms-chi.vercel.app/grooming
- Managers/admins can add bookings for groomers.
- Groomers can add their own bookings.
- Booking fields: date, hour, groomer, client name, phone, pet name, pet type,
  dog breed/type, notes, paid/unpaid.
- Buttons: Confirmed, Done, Called, Cannot Call with reason, Paid/Unpaid.
- Dashboard shows groomer booked/confirmed/completed/month counters.
- Command Center shows booked vs confirmed vs completed, paid, and month done.

### Cashier Handover Reporting

Files:

- `app/(app)/cashier/page.tsx`
- `app/(app)/cashier/actions.ts`
- `app/(app)/cashier/cashier-form.tsx`
- `supabase/migrations/017_cashier_handover_variance.sql`

Link:

- https://poms-chi.vercel.app/cashier

Behavior:

- Available to active staff as Cashier Report.
- Staff submit opening, shift-change, or closing.
- Records submitter automatically.
- Records turnover to whom.
- Records whether received amount was correct.
- Records expected cash, counted cash, missing/over amount.
- Records expected card, actual card, card variance.
- Records card tips, shop purchases, variance reason, expense notes, notes.
- Managers/owners can filter Cashier by branch.

### Fixed Sidebar

File:

- `components/shell.tsx`

Behavior:

- Desktop left sidebar is fixed while page content scrolls.
- Mobile menu remains slide-out.

### Animal / Boarding Taxonomy

Files:

- `lib/pet-taxonomy.ts`
- `app/(app)/animals/forms.tsx`
- `app/(app)/boarding/boarding-forms.tsx`

Includes expanded Birds, Small Animals, Reptiles, Fish/Aquatics, and
Insect/Feeder choices.

## Navigation And Role Notes

Managers and owners/super_admin:

- Command Center
- Send Alert
- Analytics
- Daily Reports
- Grooming
- Shop QR
- Search
- Audit Trail
- Admin settings if super_admin only

Staff:

- My Day
- My Checklist
- Shift Handover
- Animal Welfare
- Boarding & Kennel
- Grooming
- Cashier Report
- Incidents
- Memos
- Attendance
- Leave
- Performance
- My Account

Manager/super_admin are redirected away from staff-only paths such as
`/dashboard`, `/checklist`, `/handover`, `/cashier`, `/attendance`,
`/performance`, and `/break`.

## Important Files

- `components/shell.tsx` — app navigation, fixed sidebar, logout.
- `components/branch-filter.tsx` — auto-applying branch/date dropdown.
- `MOBILE_APP_READINESS.md` — Android/iOS future app readiness notes.
- `components/ui.tsx` — shared UI atoms.
- `middleware.ts` — session requirement and staff/manager redirects.
- `lib/session.ts` — profile and role helpers.
- `lib/supabase/admin.ts` — service-role server client.
- `app/(app)/overview/page.tsx` — Command Center.
- `app/(app)/admin/employees/page.tsx` — Employees list/filter.
- `app/api/admin/employees/route.ts` — employee create/update/password/leave.
- `app/(app)/grooming/` — grooming booking workflow.
- `app/(app)/cashier/` — cashier workflow.
- `app/(app)/break/` — break workflow.
- `supabase/migrations/` — all schema changes.

## Mobile App Readiness

The app is still a Next.js web app, but mobile/PWA groundwork has been added:

- `app/layout.tsx` has mobile metadata, iOS web-app settings, manifest link,
  viewport fit, and theme colors.
- `app/manifest.ts` defines the installable app manifest.
- `public/icons/poms-icon.svg` and `public/icons/poms-maskable.svg` are
  placeholder app icons.
- `MOBILE_APP_READINESS.md` explains the future Android/iOS path.

Do not add Capacitor/native dependencies until the user explicitly asks to start
the iOS/Android app project.

## Current Known Next Work

- Assign departments/sections to all staff carefully in Admin -> Employees if
  any staff still lack assignments.
- Test real QR kiosk flow on shop device.
- Test break QR after 1pm on a staff phone.
- Test cashier opening -> shift-change -> closing with real amounts.
- Test grooming booking creation and groomer completion flow.
- Consider adding edit/delete controls for grooming bookings and cash reports
  later, if the user wants correction workflows.
- Consider branch-specific daily report generation later; current Daily Reports
  page can filter branch rows if they exist, but older reports may be date-wide.

## User Preferences Learned

- Always paste SQL as a single ready-to-copy block, no extra text inside.
- User wants direct links pasted in chat.
- User prefers practical workflows matching shop operations, not abstract tools.
- Keep manager/owner dashboards separate from staff task pages.
- Branch filters should auto-apply without a Go button.

## Validation Checklist Before Final Answer

- Run `npm run build`.
- If a migration is needed, give the full ready-to-copy SQL block.
- If pushed, verify production with:
  ```bash
  npx vercel inspect https://poms-chi.vercel.app --timeout 180000
  ```
- Mention any migration that must be run before using the feature.
