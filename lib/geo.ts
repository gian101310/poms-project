// Geofence helpers — distance between two coordinates in meters (haversine).
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export type GeoSettings = {
  mode: "off" | "flag" | "block";
  lat: number;
  lng: number;
  radius: number;
  exemptRoles: string[];
};

export async function loadGeoSettings(db: any): Promise<GeoSettings> {
  const { data } = await db.from("app_settings").select("key, value")
    .in("key", ["geofence_mode", "store_lat", "store_lng", "geofence_radius_m", "geo_exempt_roles"]);
  const map: Record<string, any> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return {
    mode: (["off", "flag", "block"].includes(map.geofence_mode) ? map.geofence_mode : "off") as GeoSettings["mode"],
    lat: Number(map.store_lat ?? 0),
    lng: Number(map.store_lng ?? 0),
    radius: Number(map.geofence_radius_m ?? 150),
    exemptRoles: Array.isArray(map.geo_exempt_roles) ? map.geo_exempt_roles : ["super_admin", "manager"],
  };
}

/** Evaluate a position against the geofence. coords null = permission denied/unavailable. */
export function evaluateGeofence(
  s: GeoSettings,
  role: string,
  coords: { lat: number; lng: number } | null
): { allowed: boolean; flag: boolean; distance: number | null; reason?: string } {
  if (s.mode === "off" || s.exemptRoles.includes(role)) return { allowed: true, flag: false, distance: null };
  if (s.lat === 0 && s.lng === 0) return { allowed: true, flag: false, distance: null }; // not configured yet
  if (!coords) {
    return s.mode === "block"
      ? { allowed: false, flag: false, distance: null, reason: "Location is required. Enable location access and try again." }
      : { allowed: true, flag: true, distance: null };
  }
  const d = distanceMeters(s.lat, s.lng, coords.lat, coords.lng);
  if (d <= s.radius) return { allowed: true, flag: false, distance: d };
  return s.mode === "block"
    ? { allowed: false, flag: false, distance: d, reason: `You are ${d >= 1000 ? (d / 1000).toFixed(1) + " km" : d + " m"} from the shop. Login is only allowed at the store.` }
    : { allowed: true, flag: true, distance: d };
}
