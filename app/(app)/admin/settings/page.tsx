import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Table } from "@/components/ui";
import { SettingRow } from "./setting-forms";

export const dynamic = "force-dynamic";

const DESCRIPTIONS: Record<string, string> = {
  qr_login_mode: 'Daily shop QR gate for staff login: "off" · "flag" (allow but mark) · "block" (must scan today\'s QR)',
  qr_secret: "Secret behind the rotating QR — change it to instantly invalidate all codes",
  geofence_mode: 'Location security for login + clock: "off" · "flag" (allow but mark) · "block" (refuse away from shop)',
  store_lat: "Shop latitude — right-click your shop in Google Maps and copy the first number",
  store_lng: "Shop longitude — the second number from Google Maps",
  geofence_radius_m: "Allowed distance from the shop in meters (150–250 recommended; GPS is imprecise indoors)",
  geo_exempt_roles: 'Roles that can log in from anywhere, e.g. ["super_admin","manager"]',
  clock_ip_mode: 'Clock-in security: "off" = no check · "flag" = allow but mark for review · "block" = refuse outside store network',
  allowed_clock_ips: 'Store network IPs, comma-separated. Prefix match supported, e.g. "94.204.10.7" or "94.204."',
  overdue_threshold_minutes: "Minutes before shift end when unfinished tasks start counting as overdue",
  memo_ack_deadline_hours: "Hours an employee has to acknowledge a memo",
  photo_max_mb: "Maximum photo upload size (MB)",
  session_inactivity_minutes: "Auto-logout after this many idle minutes",
  absent_cutoff_time: "Time of day when no-shows are marked absent",
  task_tags: "Available task tags (JSON array)",
};

export default async function SettingsPage() {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const { data: settings } = await supabase.from("app_settings").select("*").order("key");

  return (
    <div>
      <PageHeader title="Company Settings"
        subtitle="Timings, security, and thresholds — everything configurable lives here. Values are JSON." />
      <Table headers={["Setting", "Value", ""]}>
        {(settings ?? []).map((s: any) => (
          <SettingRow key={s.id} setting={s} description={DESCRIPTIONS[s.key]} />
        ))}
      </Table>
      <p className="mt-4 text-xs text-slate-400">
        Tip: to lock clock-in to the store Wi-Fi, set <code>allowed_clock_ips</code> to the store&apos;s public IP
        (search &quot;what is my IP&quot; on a store device), then set <code>clock_ip_mode</code> to <code>&quot;flag&quot;</code> for a
        trial week before switching to <code>&quot;block&quot;</code>.
      </p>
    </div>
  );
}
