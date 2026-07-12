import Link from "next/link";
import { requireProfile, isSupervisorUp, isManagerUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr, fmtTime } from "@/lib/tz";
import { PageHeader, StatCard, Badge, EmptyState, Bar } from "@/components/ui";
import { ClockButtons } from "./clock-buttons";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const profile = await requireProfile();
  const supabase = createClient();
  const today = todayStr();

  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  const [instancesRes, attendanceRes, notifRes, groomingTodayRes, groomingMonthRes] = await Promise.all([
    supabase.from("checklist_instances")
      .select("id, status, work_date, departments(name), shifts(name), checklist_tasks(id, status)")
      .eq("profile_id", profile.id).eq("work_date", today),
    supabase.from("attendance_records").select("*").eq("profile_id", profile.id).eq("work_date", today).maybeSingle(),
    supabase.from("notifications").select("id, title, body, link, created_at")
      .eq("recipient_id", profile.id).is("read_at", null).order("created_at", { ascending: false }).limit(5),
    supabase.from("grooming_bookings")
      .select("id, status, payment_status")
      .eq("assigned_groomer_id", profile.id)
      .eq("booking_date", today),
    supabase.from("grooming_bookings")
      .select("id", { count: "exact", head: true })
      .eq("assigned_groomer_id", profile.id)
      .eq("status", "completed")
      .gte("booking_date", monthStart)
      .lt("booking_date", nextMonth.toISOString().slice(0, 10)),
  ]);

  const instances = instancesRes.data ?? [];
  const attendance = attendanceRes.data;
  const allTasks = instances.flatMap((i: any) => i.checklist_tasks ?? []);
  const done = allTasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
  const groomingToday = groomingTodayRes.error ? [] : (groomingTodayRes.data ?? []);
  const groomingDone = groomingToday.filter((b: any) => b.status === "completed").length;
  const groomingConfirmed = groomingToday.filter((b: any) => ["confirmed", "completed"].includes(b.status)).length;
  const groomingProgress = groomingToday.length ? Math.round((groomingDone / groomingToday.length) * 100) : 0;

  // Supervisor / manager widgets
  let pendingVerification = 0;
  let openIncidents = 0;
  if (isSupervisorUp(profile.role)) {
    const { count: pv } = await supabase.from("checklist_tasks")
      .select("id", { count: "exact", head: true }).eq("status", "completed");
    pendingVerification = pv ?? 0;
    const { count: oi } = await supabase.from("incident_reports")
      .select("id", { count: "exact", head: true }).in("status", ["open", "investigating"]);
    openIncidents = oi ?? 0;
  }

  return (
    <div>
      <PageHeader title={`Welcome, ${profile.full_name.split(" ")[0]}`} subtitle={today} action={<ClockButtons clockedIn={!!attendance?.clock_in} clockedOut={!!attendance?.clock_out} />} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Today's Tasks" value={`${done}/${allTasks.length}`} hint="completed" />
        <StatCard label="Clock In" value={attendance?.clock_in ? fmtTime(attendance.clock_in) : "—"} />
        <StatCard label="Clock Out" value={attendance?.clock_out ? fmtTime(attendance.clock_out) : "—"} />
        {isSupervisorUp(profile.role)
          ? <StatCard label="Awaiting Verification" value={pendingVerification} hint="tasks to verify" />
          : <StatCard label="Unread Notices" value={(notifRes.data ?? []).length} />}
      </div>

      {isSupervisorUp(profile.role) && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Open Incidents" value={openIncidents} />
          <Link href="/verify" className="card flex items-center justify-center p-4 text-sm font-medium text-brand-600 hover:underline">Open verification queue →</Link>
          {isManagerUp(profile.role) && (
            <Link href="/analytics" className="card flex items-center justify-center p-4 text-sm font-medium text-brand-600 hover:underline">View analytics →</Link>
          )}
        </div>
      )}

      {!groomingTodayRes.error && groomingToday.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Grooming Today</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="Booked" value={groomingToday.length} />
            <StatCard label="Confirmed" value={groomingConfirmed} />
            <StatCard label="Completed" value={`${groomingDone}/${groomingToday.length}`} />
            <StatCard label="This Month" value={groomingMonthRes.count ?? 0} hint="completed grooming" />
          </div>
          <div className="card mt-3 p-4">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Booking progress</span>
              <span>{groomingProgress}%</span>
            </div>
            <Bar pct={groomingProgress} color={groomingProgress >= 80 ? "bg-green-500" : groomingProgress >= 50 ? "bg-amber-500" : "bg-red-500"} />
            <Link href="/grooming" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">Open grooming bookings →</Link>
          </div>
        </section>
      )}

      <h2 className="mb-3 text-lg font-semibold">Today&apos;s Checklists</h2>
      {instances.length === 0 ? (
        <EmptyState message="No checklist generated for today. If you are scheduled to work, contact your supervisor." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {instances.map((inst: any) => {
            const tasks = inst.checklist_tasks ?? [];
            const d = tasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
            return (
              <Link key={inst.id} href="/checklist" className="card p-4 hover:border-brand-400">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{inst.departments?.name} — {inst.shifts?.name}</p>
                  <Badge value={inst.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{d} of {tasks.length} tasks done</p>
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${tasks.length ? (d / tasks.length) * 100 : 0}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {(notifRes.data ?? []).length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Recent Notifications</h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {(notifRes.data ?? []).map((n: any) => (
              <Link key={n.id} href={n.link || "/notifications"} className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-slate-500">{n.body}</p>}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
