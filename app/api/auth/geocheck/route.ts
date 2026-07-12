import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadGeoSettings, evaluateGeofence } from "@/lib/geo";
import { loadQrSettings, validQrToken } from "@/lib/qr";

// Login gate — runs right after password sign-in. Combines:
//  1. Geofence (GPS distance from the shop)
//  2. Daily shop QR token (staff must have scanned today's code)
// Exempt roles (geo_exempt_roles) skip both. Records everything on the
// login session, and signs the user back out when a gate blocks them.
// POST { lat?, lng?, qr?, session_id? }

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch { }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role, status").eq("id", user.id).single();
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return NextResponse.json({ allowed: false, reason: "Account disabled." });
  }

  const geoSettings = await loadGeoSettings(admin);
  const exempt = geoSettings.exemptRoles.includes(profile.role);

  // 1. Geofence
  const coords = typeof body.lat === "number" && typeof body.lng === "number"
    ? { lat: body.lat, lng: body.lng }
    : null;
  const geo = evaluateGeofence(geoSettings, profile.role, coords);

  // 2. Daily QR token
  let qrAllowed = true;
  let qrFlag = false;
  let qrReason: string | undefined;
  const qr = await loadQrSettings(admin);
  if (qr.mode !== "off" && !exempt && qr.secret) {
    const ok = validQrToken(qr.secret, body.qr);
    if (!ok) {
      if (qr.mode === "block") {
        qrAllowed = false;
        qrReason = "Please scan today's shop QR code to log in.";
      } else {
        qrFlag = true;
      }
    }
  }

  const allowed = geo.allowed && qrAllowed;
  const flagged = geo.flag || qrFlag;
  const now = new Date().toISOString();

  if (body.session_id) {
    await admin.from("login_sessions").update({
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      geo_distance_m: geo.distance,
      flagged,
      ...(allowed ? {} : { logout_at: now, closed_by: "system" }),
    }).eq("id", body.session_id).eq("profile_id", user.id);

    if (allowed) {
      await admin.from("login_sessions").update({
        logout_at: now,
        closed_by: "system",
      })
        .eq("profile_id", user.id)
        .is("logout_at", null)
        .neq("id", body.session_id);
    }
  }

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.json({ allowed: false, reason: geo.allowed ? qrReason : geo.reason });
  }
  return NextResponse.json({ allowed: true, flagged });
}
