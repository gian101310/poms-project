import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Table } from "@/components/ui";
import { SettingRow } from "./setting-forms";

export const dynamic = "force-dynamic";

const DESCRIPTIONS: Record<string, string> = {
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
