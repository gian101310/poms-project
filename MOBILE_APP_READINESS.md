# Mobile App Readiness

Last updated: 2026-07-13.

POMS is still a Next.js web app, but it is now prepared to become mobile-app
ready in stages.

## What Is Ready Now

- Mobile metadata is configured in `app/layout.tsx`.
- PWA manifest is generated from `app/manifest.ts`.
- App icons live in `public/icons/`.
- Production start URL is `/login`.
- Display mode is `standalone`, so the app can be added to a phone home screen.
- Viewport uses `viewport-fit=cover` for iOS safe-area support.
- Theme colors are set for light and dark mode.
- Sidebar remains desktop-fixed and mobile uses a slide-out menu.

## Current Mobile Test URL

https://poms-chi.vercel.app

On iPhone:

1. Open the site in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

On Android:

1. Open the site in Chrome.
2. Tap the menu.
3. Tap Add to Home screen or Install app.

## Future Native App Path

Recommended path when ready:

1. Keep POMS as the source web app.
2. Add Capacitor for iOS/Android packaging.
3. Use the production web app or a local static/web build inside the native shell.
4. Add native permissions carefully:
   - Camera for QR/photo workflows.
   - Location for geofence login/clock/break.
   - Notifications for alerts and task reminders.
5. Test on real shop devices before app-store submission.

## Important Work Before Native Release

- Replace SVG placeholder icons with final PNG icons:
  - 192x192
  - 512x512
  - 1024x1024 app-store source
  - maskable Android icon
- Decide if the native app should load:
  - hosted production URL, easiest to maintain; or
  - bundled static app, more complex because POMS uses server-side auth/actions.
- Add push notifications only after notification rules are final.
- Add an offline strategy only for pages that can safely queue work.
- Confirm every critical staff workflow works on small phones:
  - QR login
  - Break scan
  - Checklist tasks
  - Grooming bookings
  - Cashier report
  - Boarding
  - Command Center on manager phone

## Files To Check

- `app/layout.tsx` — mobile metadata and viewport.
- `app/manifest.ts` — install manifest.
- `public/icons/poms-icon.svg` — general app icon.
- `public/icons/poms-maskable.svg` — Android maskable icon.
- `components/shell.tsx` — responsive app shell/sidebar.
- `MOBILE_APP_READINESS.md` — this file.

## Do Not Do Yet

- Do not add Capacitor dependencies until the user is ready to create native
  projects.
- Do not add service-worker caching blindly; POMS has auth, live tasks, and
  attendance flows that should not cache stale data.
- Do not store Supabase service-role secrets in any mobile/client code.
