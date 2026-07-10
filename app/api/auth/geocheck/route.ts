import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadGeoSettings, evaluateGeofence } from "@/lib/geo";

// Called right after password sign-in. Decides whether the login may proceed
// based on the geofence, records the location on the login session, and
// signs the user back out when the geofence blocks them.
// POST { lat?, lng?, session_id? }

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

  const settings = await loadGeoSettings(admin);
  const coords = typeof body.lat === "number" && typeof body.lng === "number"
    ? { lat: body.lat, lng: body.lng }
    : null;
  const verdict = evaluateGeofence(settings, profile.role, coords);

  // Record on the login session (append-only history keeps every attempt)
  if (body.session_id) {
    await admin.from("login_sessions").update({
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      geo_distance_m: verdict.distance,
      flagged: verdict.flag,
      ...(verdict.allowed ? {} : { logout_at: new Date().toISOString(), closed_by: "system" }),
    }).eq("id", body.session_id).eq("profile_id", user.id);
  }

  if (!verdict.allowed) {
    await supabase.auth.signOut();
    return NextResponse.json({ allowed: false, reason: verdict.reason });
  }
  return NextResponse.json({ allowed: true, flagged: verdict.flag, distance: verdict.distance });
}
