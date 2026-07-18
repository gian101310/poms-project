import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr, fmtTime } from "@/lib/tz";
import { PageHeader, StatCard, Badge, EmptyState, Bar } from "@/components/ui";
import { BranchFilter } from "@/components/branch-filter";
import { DeliveryToggle, InlineVerify, FollowupButton } from "./overview-actions-ui";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: { date?: string; branch?: string } }) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const date = searchParams.date ?? todayStr();
  const selectedBranch = searchParams.branch && searchParams.branch !== "all" ? searchParams.branch : null;
  const today = todayStr();
  const leaveUntil = new Date(`${today}T00:00:00Z`);
  leaveUntil.setUTCDate(leaveUntil.getUTCDate() + 20);
  const leaveUntilStr = leaveUntil.toISOString().slice(0, 10);
  const monthStart = `${date.slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  let instQuery = supabase.from("checklist_instances")
      .select(`id, profile_id, department_id, status,
        departments!inner(id, name, store_id), shifts(name),
        profiles!checklist_instances_profile_id_fkey(id, full_name, employee_code),
        checklist_tasks(id, title, status, priority, tags, is_overdue, employee_remarks, supervisor_remarks, completed_at, duration_minutes, blocked, blocked_reason)`)
      .eq("work_date", date)
      .eq("status", "open");
  let attQuery = supabase.from("attendance_records").select("profile_id, status, late_minutes, flagged, profiles!inner(store_id)").eq("work_date", date);
  let incQuery = selectedBranch
    ? supabase.from("incident_reports").select("id, departments!inner(store_id)", { count: "exact", head: true }).eq("departments.store_id", selectedBranch)
    : supabase.from("incident_reports").select("id", { count: "exact", head: true });
  incQuery = incQuery.gte("created_at", date + "T00:00:00Z").lt("created_at", date + "T23:59:59Z");
  let deptsQuery = supabase.from("departments").select("id, name").eq("is_active", true).order("name");
  let followQuery = supabase.from("followup_tasks").select("*, departments!inner(name, store_id), profiles!followup_tasks_profile_id_fkey(full_name)")
      .is("consumed_at", null).order("target_date");
  let cashQuery = supabase.from("cash_reports").select("phase, opening_float, closing_float, cash_sales, card_sales, tips, expenses, created_at, store_id").eq("report_date", date);
  let breakQuery = supabase.from("break_sessions")
      .select("id, profile_id, started_at, ended_at, duration_minutes, flagged, flag_reason, profiles(full_name, employee_code)")
      .eq("work_date", date)
      .order("started_at", { ascending: false });
  let profilesQuery = supabase.from("profiles")
      .select("id, full_name, employee_code, role, store_id, stores(name), department_assignments(departments(name))")
      .eq("status", "active")
      .in("role", ["staff", "supervisor"])
      .order("full_name");
  let schedulesQuery = supabase.from("employee_schedules")
      .select("profile_id, status, shifts(name, start_time, end_time), profiles!inner(store_id)")
      .eq("work_date", date);
  let leaveQuery = supabase.from("leave_requests")
      .select("id, profile_id, leave_type, date_from, date_to, status, profiles!inner(full_name, employee_code, store_id)")
      .eq("status", "approved")
      .lte("date_from", leaveUntilStr)
      .gte("date_to", today)
      .order("date_from");
  let deliveryQuery = supabase.from("staff_delivery_runs")
      .select("id, profile_id, started_at, ended_at")
      .eq("work_date", date)
      .order("started_at", { ascending: false });
  let groomingQuery = supabase.from("grooming_bookings")
      .select("id, assigned_groomer_id, status, payment_status, profiles!grooming_bookings_assigned_groomer_id_fkey(full_name)")
      .eq("booking_date", date);
  let groomingMonthQuery = supabase.from("grooming_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("booking_date", monthStart)
      .lt("booking_date", nextMonth.toISOString().slice(0, 10));
  if (selectedBranch) {
    instQuery = instQuery.eq("departments.store_id", selectedBranch);
    attQuery = attQuery.eq("profiles.store_id", selectedBranch);
    deptsQuery = deptsQuery.eq("store_id", selectedBranch);
    followQuery = followQuery.eq("departments.store_id", selectedBranch);
    cashQuery = cashQuery.eq("store_id", selectedBranch);
    breakQuery = breakQuery.eq("store_id", selectedBranch);
    profilesQuery = profilesQuery.eq("store_id", selectedBranch);
    schedulesQuery = schedulesQuery.eq("profiles.store_id", selectedBranch);
    leaveQuery = leaveQuery.eq("profiles.store_id", selectedBranch);
    deliveryQuery = deliveryQuery.eq("store_id", selectedBranch);
    groomingQuery = groomingQuery.eq("store_id", selectedBranch);
    groomingMonthQuery = groomingMonthQuery.eq("store_id", selectedBranch);
  }

  let boardingQuery = supabase.from("boarding_stays")
    .select("id, store_id, owner_name, owner_contact, check_in_date, check_out_date, payment_status, amount, status, stores(name), boarding_pets(id, pet_type, pet_breed, pet_name)")
    .lte("check_in_date", date)
    .gte("check_out_date", date)
    .order("check_out_date", { ascending: true });
  if (selectedBranch) boardingQuery = boardingQuery.eq("store_id", selectedBranch);
  let kennelReportsQuery = supabase.from("kennel_reports")
    .select("id, report_date, category, submitted_by_name, submitted_at, total_animals, feeding_done, cleaning_done, walking_done, rows, store_id")
    .eq("report_date", date)
    .order("submitted_at", { ascending: false });
  if (selectedBranch) kennelReportsQuery = kennelReportsQuery.eq("store_id", selectedBranch);
  let shopAnimalReportsQuery = supabase.from("shop_animal_reports")
    .select("id, submitted_by_name, submitted_at, total_animals, feeding_done, cleaning_done, rows, store_id")
    .eq("report_date", date)
    .order("submitted_at", { ascending: false });
  if (selectedBranch) shopAnimalReportsQuery = shopAnimalReportsQuery.eq("store_id", selectedBranch);
  let kennelInspectionsQuery = supabase.from("kennel_inspections")
    .select("id, category, pet_type, animal_name, cage_number, inspector_name, inspection_shift, status, remarks, action_needed, created_at, store_id")
    .eq("inspection_date", date)
    .order("created_at", { ascending: false });
  if (selectedBranch) kennelInspectionsQuery = kennelInspectionsQuery.eq("store_id", selectedBranch);
  let shopInspectionsQuery = supabase.from("shop_animal_inspections")
    .select("id, pet_type, animal_name, display_area, cage_number, inspector_name, inspection_shift, status, remarks, action_needed, created_at, store_id")
    .eq("inspection_date", date)
    .order("created_at", { ascending: false });
  if (selectedBranch) shopInspectionsQuery = shopInspectionsQuery.eq("store_id", selectedBranch);
  let groomingInspectionsQuery = supabase.from("grooming_inspections")
    .select("id, grooming_booking_id, inspector_name, inspection_shift, status, remarks, action_needed, created_at, store_id, grooming_bookings(pet_name, pet_type, client_name)")
    .eq("inspection_date", date)
    .order("created_at", { ascending: false });
  if (selectedBranch) groomingInspectionsQuery = groomingInspectionsQuery.eq("store_id", selectedBranch);

  const [branchesRes, instRes, attRes, incRes, deptsRes, followRes, cashRes, breakRes, profilesRes, schedulesRes, leaveRes, deliveryRes, groomingRes, groomingMonthRes, boardingRes, kennelReportsRes, shopAnimalReportsRes, kennelInspectionsRes, shopInspectionsRes, groomingInspectionsRes] = await Promise.all([
    supabase.from("stores").select("id, name, code").eq("is_active", true).order("name"),
    instQuery,
    attQuery,
    incQuery,
    deptsQuery,
    followQuery,
    cashQuery,
    breakQuery,
    profilesQuery,
    schedulesQuery,
    leaveQuery,
    deliveryQuery,
    groomingQuery,
    groomingMonthQuery,
    boardingQuery,
    kennelReportsQuery,
    shopAnimalReportsQuery,
    kennelInspectionsQuery,
    shopInspectionsQuery,
    groomingInspectionsQuery,
  ]);

  const instances = (instRes.data ?? []) as any[];
  const attendance = attRes.data ?? [];
  const attMap = Object.fromEntries(attendance.map((a: any) => [a.profile_id, a]));

  const allTasks = instances.flatMap((i) => i.checklist_tasks ?? []);
  const done = allTasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
  const verified = allTasks.filter((t: any) => t.status === "verified").length;
  const overdue = allTasks.filter((t: any) => t.is_overdue).length;
  const blocked = allTasks.filter((t: any) => t.blocked).length;
  const onTime = allTasks.filter((t: any) => ["completed", "verified"].includes(t.status) && !t.is_overdue).length;
  const cashReports = (cashRes.data ?? []) as any[];
  const breakSessions = (breakRes.data ?? []) as any[];
  const activeBreakMap = new Map(breakSessions.filter((b: any) => !b.ended_at).map((b: any) => [b.profile_id, b]));
  const staffProfiles = (profilesRes.data ?? []) as any[];
  const schedules = (schedulesRes.data ?? []) as any[];
  const scheduleMap = new Map(schedules.map((s: any) => [s.profile_id, s]));
  const approvedLeaves = (leaveRes.data ?? []) as any[];
  const currentLeaveMap = new Map(approvedLeaves
    .filter((l: any) => l.date_from <= date && l.date_to >= date)
    .map((l: any) => [l.profile_id, l]));
  const upcomingLeaves = approvedLeaves.filter((l: any) => l.date_from >= today && l.date_from <= leaveUntilStr);
  const deliveryRows = deliveryRes.error ? [] : ((deliveryRes.data ?? []) as any[]);
  const groomingRows = groomingRes.error ? [] : ((groomingRes.data ?? []) as any[]);
  const groomingBooked = groomingRows.length;
  const groomingConfirmed = groomingRows.filter((g: any) => ["confirmed", "completed"].includes(g.status)).length;
  const groomingCompleted = groomingRows.filter((g: any) => g.status === "completed").length;
  const groomingPaid = groomingRows.filter((g: any) => g.payment_status === "paid").length;
  const boardingRows = (boardingRes.data ?? []) as any[];
  const activeBoarding = boardingRows.filter((b: any) => b.status === "active");
  const boardingPetCount = activeBoarding.reduce((sum: number, b: any) => sum + (b.boarding_pets?.length ?? 0), 0);
  const boardingDueOut = activeBoarding.filter((b: any) => b.check_out_date === date).length;
  const boardingArrivals = activeBoarding.filter((b: any) => b.check_in_date === date).length;
  const kennelReports = kennelReportsRes.error ? [] : ((kennelReportsRes.data ?? []) as any[]);
  const shopAnimalReports = shopAnimalReportsRes.error ? [] : ((shopAnimalReportsRes.data ?? []) as any[]);
  const kennelInspections = [
    ...(kennelInspectionsRes.error ? [] : ((kennelInspectionsRes.data ?? []) as any[]).map((item) => ({ ...item, source_type: "boarding" }))),
    ...(shopInspectionsRes.error ? [] : ((shopInspectionsRes.data ?? []) as any[]).map((item) => ({ ...item, source_type: "shop" }))),
    ...(groomingInspectionsRes.error ? [] : ((groomingInspectionsRes.data ?? []) as any[]).map((item) => ({
      ...item,
      source_type: "grooming",
      animal_name: item.grooming_bookings?.pet_name ?? item.grooming_bookings?.client_name,
      pet_type: item.grooming_bookings?.pet_type ?? "Grooming",
      display_area: "Grooming",
      cage_number: "",
    }))),
  ];
  const kennelInspectionIssues = kennelInspections.filter((item: any) => item.status !== "ok" || item.action_needed || item.remarks);
  const kennelTotals = kennelReports.reduce((acc, report) => ({
    animals: acc.animals + Number(report.total_animals ?? 0),
    feeding: acc.feeding + Number(report.feeding_done ?? 0),
    cleaning: acc.cleaning + Number(report.cleaning_done ?? 0),
    walking: acc.walking + Number(report.walking_done ?? 0),
  }), { animals: 0, feeding: 0, cleaning: 0, walking: 0 });
  const shopAnimalTotals = shopAnimalReports.reduce((acc, report) => ({
    animals: acc.animals + Number(report.total_animals ?? 0),
    feeding: acc.feeding + Number(report.feeding_done ?? 0),
    cleaning: acc.cleaning + Number(report.cleaning_done ?? 0),
  }), { animals: 0, feeding: 0, cleaning: 0 });
  const shopAnimalByCategory = shopAnimalReports.flatMap((report: any) => report.rows ?? [])
    .reduce((acc: Record<string, number>, row: any) => {
      const key = String(row.shop_category ?? "shop_animals").replace(/_/g, " ");
      acc[key] = (acc[key] ?? 0) + Number(row.quantity ?? 1);
      return acc;
    }, {});
  const activeDeliveryMap = new Map(deliveryRows.filter((d: any) => !d.ended_at).map((d: any) => [d.profile_id, d]));
  const onBreak = breakSessions.filter((b: any) => !b.ended_at).length;
  const flaggedBreaks = breakSessions.filter((b: any) => b.flagged).length;
  const outForDelivery = activeDeliveryMap.size;
  const cashTotals = cashReports.reduce((acc, r) => ({
    cash_sales: acc.cash_sales + Number(r.cash_sales ?? 0),
    card_sales: acc.card_sales + Number(r.card_sales ?? 0),
    tips: acc.tips + Number(r.tips ?? 0),
    expenses: acc.expenses + Number(r.expenses ?? 0),
  }), { cash_sales: 0, card_sales: 0, tips: 0, expenses: 0 });
  const money = (value: number) => `AED ${value.toLocaleString("en-AE", { maximumFractionDigits: 0 })}`;

  const kpi = {
    completion: allTasks.length ? Math.round((done / allTasks.length) * 100) : 0,
    verifiedPct: done ? Math.round((verified / done) * 100) : 0,
    onTimePct: allTasks.length ? Math.round((onTime / allTasks.length) * 100) : 0,
  };

  // group instances by department
  const byDept = new Map<string, { name: string; instances: any[] }>();
  for (const d of deptsRes.data ?? []) byDept.set(d.id, { name: d.name, instances: [] });
  for (const inst of instances) {
    const entry = byDept.get(inst.department_id) ?? { name: inst.departments?.name ?? "?", instances: [] };
    entry.instances.push(inst);
    byDept.set(inst.department_id, entry);
  }

  const pendingFollowups = (followRes.data ?? []) as any[];
  const staffStats = staffProfiles.map((staff: any) => {
    const staffInstances = instances.filter((i) => i.profile_id === staff.id);
    const tasks = staffInstances.flatMap((i) => i.checklist_tasks ?? []);
    const completed = tasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
    const unfinished = tasks.filter((t: any) => !["completed", "verified"].includes(t.status));
    const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    const schedule = scheduleMap.get(staff.id) as any;
    const shift = schedule?.shifts;
    const shiftName = schedule?.status === "off" ? "Off" : schedule?.status === "leave" ? "Leave" : shift?.name ?? "No shift";
    const shiftBucket = schedule?.status === "leave"
      ? "leave"
      : schedule?.status === "off"
        ? "off"
        : String(shift?.name ?? "").toLowerCase().includes("afternoon") || String(shift?.start_time ?? "") >= "12:00"
          ? "afternoon"
          : shift
            ? "morning"
            : "unscheduled";
    return {
      staff,
      instances: staffInstances,
      tasks,
      completed,
      unfinished,
      pct,
      attendance: attMap[staff.id],
      schedule,
      shift,
      shiftName,
      shiftBucket,
      currentLeave: currentLeaveMap.get(staff.id),
      activeBreak: activeBreakMap.get(staff.id),
      activeDelivery: activeDeliveryMap.get(staff.id),
    };
  });
  const absentStaff = staffStats.filter((s) => s.attendance?.status === "absent" || s.currentLeave || s.schedule?.status === "leave");
  const morningStaff = staffStats.filter((s) => s.shiftBucket === "morning");
  const afternoonStaff = staffStats.filter((s) => s.shiftBucket === "afternoon");

  return (
    <div>
      <div className="sticky top-[57px] z-20 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/95 px-4 pb-3 pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:-mx-6 md:px-6">
        <PageHeader title="Command Center" subtitle={`Every department, every employee — ${date}`}
          action={<BranchFilter branches={branchesRes.data ?? []} selected={selectedBranch ?? "all"} includeDate date={date} />} />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
          <StatCard label="Completion" value={`${kpi.completion}%`} hint={`${done}/${allTasks.length} tasks`} />
          <StatCard label="On-Time" value={`${kpi.onTimePct}%`} />
          <StatCard label="Verified" value={`${kpi.verifiedPct}%`} hint="of completed" />
          <StatCard label="Overdue" value={overdue} />
          <StatCard label="Blocked" value={blocked} />
          <StatCard label="Present / Late" value={`${attendance.filter((a: any) => a.status === "present").length} / ${attendance.filter((a: any) => a.status === "late").length}`} />
          <StatCard label="Absent" value={attendance.filter((a: any) => a.status === "absent").length} />
          <StatCard label="Incidents" value={incRes.count ?? 0} />
          <StatCard label="On Break" value={onBreak} />
          <StatCard label="Break Flags" value={flaggedBreaks} />
          <StatCard label="Delivery Out" value={outForDelivery} />
          <StatCard label="Grooming" value={`${groomingCompleted}/${groomingBooked}`} hint={`${groomingConfirmed} confirmed`} />
          <StatCard label="Boarding" value={activeBoarding.length} hint={`${boardingPetCount} pet(s)`} />
          <StatCard label="Kennel Reports" value={kennelReports.length} hint={`${kennelTotals.animals} animal(s)`} />
          <StatCard label="Shop Animals" value={shopAnimalTotals.animals} hint={`${shopAnimalReports.length} report(s)`} />
          <StatCard label="Inspections" value={kennelInspections.length} hint={`${kennelInspectionIssues.length} issue(s)`} />
        </div>
      </div>

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Staff Live Board</h2>
          {deliveryRes.error && <span className="text-xs text-amber-600">Run migration 015 to enable delivery status.</span>}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {staffStats.map((s) => {
            const attendanceStatus = s.currentLeave ? "on_leave" : s.attendance?.status;
            return (
              <div key={s.staff.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{s.staff.full_name}</p>
                    <p className="text-xs text-slate-400">
                      {s.staff.employee_code} · {s.staff.stores?.name ?? "Branch"} · {s.shiftName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(s.staff.department_assignments ?? []).map((a: any) => a.departments?.name).filter(Boolean).join(", ") || "No department"}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {attendanceStatus && <Badge value={attendanceStatus} />}
                    {s.activeBreak && <Badge value="on break" />}
                    {s.activeDelivery && <Badge value="delivery" />}
                    <DeliveryToggle profileId={s.staff.id} isOut={Boolean(s.activeDelivery)} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span>{s.completed}/{s.tasks.length} done · {s.unfinished.length} unfinished</span>
                  </div>
                  <Bar pct={s.pct} color={s.pct >= 80 ? "bg-green-500" : s.pct >= 50 ? "bg-amber-500" : "bg-red-500"} />
                </div>
                {s.unfinished.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.unfinished.slice(0, 4).map((t: any) => (
                      <span key={t.id} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t.blocked ? "Can't complete: " : ""}{t.title}
                      </span>
                    ))}
                    {s.unfinished.length > 4 && <span className="text-xs text-slate-400">+{s.unfinished.length - 4} more</span>}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  {s.activeBreak && <span>Break since {fmtTime(s.activeBreak.started_at)}</span>}
                  {s.activeDelivery && <span>Delivery since {fmtTime(s.activeDelivery.started_at)}</span>}
                  {s.currentLeave && <span>Leave: {s.currentLeave.date_from} to {s.currentLeave.date_to}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mb-6 grid gap-3 lg:grid-cols-3">
        <div className="card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Absent / On Leave Today</p>
          {absentStaff.length ? absentStaff.map((s) => (
            <div key={s.staff.id} className="flex items-center justify-between gap-2 py-1 text-sm">
              <span>{s.staff.full_name}</span>
              <Badge value={s.currentLeave || s.schedule?.status === "leave" ? "on_leave" : "absent"} />
            </div>
          )) : <p className="text-sm text-slate-400">None</p>}
        </div>
        <div className="card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Upcoming Leave - Next 20 Days</p>
          {upcomingLeaves.length ? upcomingLeaves.slice(0, 8).map((l: any) => (
            <div key={l.id} className="py-1 text-sm">
              <span className="font-medium">{l.profiles?.full_name}</span>
              <span className="text-slate-400"> · {l.date_from} to {l.date_to}</span>
            </div>
          )) : <p className="text-sm text-slate-400">No approved leave coming up</p>}
        </div>
        <div className="card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Shift Split</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-medium">Morning</p>
              <p className="text-xs text-slate-400">{morningStaff.map((s) => s.staff.full_name).join(", ") || "None"}</p>
            </div>
            <div>
              <p className="font-medium">Afternoon</p>
              <p className="text-xs text-slate-400">{afternoonStaff.map((s) => s.staff.full_name).join(", ") || "None"}</p>
            </div>
          </div>
        </div>
      </div>

      {!groomingRes.error && (
        <div className="card mb-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Grooming summary</p>
              <p className="mt-1 text-sm text-slate-500">Booked vs confirmed vs completed for {date}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <div><p className="font-semibold">{groomingBooked}</p><p className="text-xs text-slate-400">Booked</p></div>
              <div><p className="font-semibold">{groomingConfirmed}</p><p className="text-xs text-slate-400">Confirmed</p></div>
              <div><p className="font-semibold">{groomingCompleted}</p><p className="text-xs text-slate-400">Completed</p></div>
              <div><p className="font-semibold">{groomingPaid}</p><p className="text-xs text-slate-400">Paid</p></div>
              <div><p className="font-semibold">{groomingMonthRes.count ?? 0}</p><p className="text-xs text-slate-400">Month done</p></div>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Boarding status</p>
            <p className="mt-1 text-sm text-slate-500">Current stays for {date}</p>
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div><p className="font-semibold">{activeBoarding.length}</p><p className="text-xs text-slate-400">Active stays</p></div>
            <div><p className="font-semibold">{boardingPetCount}</p><p className="text-xs text-slate-400">Pets</p></div>
            <div><p className="font-semibold">{boardingArrivals}</p><p className="text-xs text-slate-400">Arrivals</p></div>
            <div><p className="font-semibold">{boardingDueOut}</p><p className="text-xs text-slate-400">Due out</p></div>
          </div>
        </div>
        {activeBoarding.length === 0 ? (
          <p className="text-sm text-slate-400">No active boarding stays for this date.</p>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {activeBoarding.slice(0, 8).map((b: any) => (
              <div key={b.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{b.owner_name}</p>
                    <p className="text-xs text-slate-400">
                      {b.stores?.name ?? "Branch"} · {b.check_in_date} to {b.check_out_date}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge value={b.status} />
                    <Badge value={b.payment_status} />
                    {b.check_in_date === date && <Badge value="opening" />}
                    {b.check_out_date === date && <Badge value="closing" />}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {(b.boarding_pets ?? []).map((p: any) =>
                    `${p.pet_name ? `${p.pet_name} · ` : ""}${p.pet_type}${p.pet_breed ? ` (${p.pet_breed})` : ""}`
                  ).join(", ") || "No pets listed"}
                </p>
              </div>
            ))}
            {activeBoarding.length > 8 && <p className="text-xs text-slate-400">+{activeBoarding.length - 8} more active boarding stay(s)</p>}
          </div>
        )}
      </div>

      <div className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Shop animal reports</p>
            <p className="mt-1 text-sm text-slate-500">Animals on sale/display checked for {date}</p>
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div><p className="font-semibold">{shopAnimalReports.length}</p><p className="text-xs text-slate-400">Reports</p></div>
            <div><p className="font-semibold">{shopAnimalTotals.animals}</p><p className="text-xs text-slate-400">Animals</p></div>
            <div><p className="font-semibold">{shopAnimalTotals.feeding}</p><p className="text-xs text-slate-400">Fed</p></div>
            <div><p className="font-semibold">{shopAnimalTotals.cleaning}</p><p className="text-xs text-slate-400">Cleaned</p></div>
          </div>
        </div>
        {shopAnimalReportsRes.error ? (
          <p className="text-sm text-amber-600">Run migration 021 to enable shop animal reports.</p>
        ) : shopAnimalReports.length === 0 ? (
          <p className="text-sm text-slate-400">No shop animal reports submitted yet.</p>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {shopAnimalReports.slice(0, 8).map((report: any) => (
              <div key={report.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">Shop animals</p>
                    <p className="text-xs text-slate-400">
                      {report.submitted_by_name} · {fmtTime(report.submitted_at)}
                    </p>
                  </div>
                  <Badge value="submitted" />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {report.total_animals} animal(s) · feeding {report.feeding_done} · cleaning {report.cleaning_done}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {(report.rows ?? []).map((row: any) => String(row.shop_category ?? "shop_animals").replace(/_/g, " ")).filter(Boolean).join(", ") || "No category"}
                </p>
              </div>
            ))}
          </div>
        )}
        {Object.keys(shopAnimalByCategory).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {Object.entries(shopAnimalByCategory).map(([category, count]) => (
              <span key={category} className="rounded-full bg-slate-100 px-2 py-1 capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {category}: {Number(count)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kennel report submissions</p>
            <p className="mt-1 text-sm text-slate-500">Submitted from the public boarding sheet for {date}</p>
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div><p className="font-semibold">{kennelReports.length}</p><p className="text-xs text-slate-400">Reports</p></div>
            <div><p className="font-semibold">{kennelTotals.animals}</p><p className="text-xs text-slate-400">Animals</p></div>
            <div><p className="font-semibold">{kennelTotals.feeding}</p><p className="text-xs text-slate-400">Fed</p></div>
            <div><p className="font-semibold">{kennelTotals.cleaning}</p><p className="text-xs text-slate-400">Cleaned</p></div>
          </div>
        </div>
        {kennelReportsRes.error ? (
          <p className="text-sm text-amber-600">Run migration 019 to enable submitted kennel reports.</p>
        ) : kennelReports.length === 0 ? (
          <p className="text-sm text-slate-400">No kennel reports submitted yet.</p>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {kennelReports.slice(0, 8).map((report: any) => (
              <div key={report.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium capitalize">{String(report.category).replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-400">
                      {report.submitted_by_name} · {fmtTime(report.submitted_at)}
                    </p>
                  </div>
                  <Badge value="submitted" />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {report.total_animals} animal(s) · feeding {report.feeding_done} · cleaning {report.cleaning_done}
                  {report.walking_done ? ` · walking ${report.walking_done}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {(report.rows ?? []).map((row: any) => {
                    const overdue = Number(row.overdue_days ?? 0);
                    const updated = row.last_updated_by ? `updated by ${row.last_updated_by}` : "";
                    return [row.animal_name, overdue ? `${overdue} overdue day(s)` : "", updated].filter(Boolean).join(" · ");
                  }).filter(Boolean).slice(0, 3).join(" | ") || "No boarding detail"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kennel inspection notes</p>
            <p className="mt-1 text-sm text-slate-500">Admin inspection remarks for {date}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="font-semibold">{kennelInspections.length}</p><p className="text-xs text-slate-400">Checks</p></div>
            <div><p className="font-semibold">{kennelInspectionIssues.length}</p><p className="text-xs text-slate-400">Issues</p></div>
          </div>
        </div>
        {kennelInspectionsRes.error || shopInspectionsRes.error || groomingInspectionsRes.error ? (
          <p className="text-sm text-amber-600">Run migrations 020, 021, and 022 to enable all admin inspection notes.</p>
        ) : kennelInspections.length === 0 ? (
          <p className="text-sm text-slate-400">No admin inspection submitted yet.</p>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {kennelInspections.slice(0, 8).map((item: any) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.animal_name || item.pet_type}</p>
                    <p className="text-xs text-slate-400">
                      {String(item.source_type).replace(/_/g, " ")} · {item.inspection_shift} · {item.inspector_name} · {fmtTime(item.created_at)}
                    </p>
                  </div>
                  <Badge value={item.status} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {[item.display_area, item.cage_number].filter(Boolean).join(" / ") || "Location not set"}{item.remarks ? ` · ${item.remarks}` : ""}{item.action_needed ? ` · Needs: ${item.action_needed}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Cash Drop" value={money(cashTotals.cash_sales)} hint={`${cashReports.length} report(s)`} />
        <StatCard label="Card Sales" value={money(cashTotals.card_sales)} />
        <StatCard label="Tips" value={money(cashTotals.tips)} />
        <StatCard label="Expenses" value={money(cashTotals.expenses)} />
      </div>

      {pendingFollowups.length > 0 && (
        <div className="card mb-6 border-l-4 border-l-amber-500 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Queued follow-ups (added to future checklists)</p>
          <ul className="space-y-1 text-sm">
            {pendingFollowups.map((f) => (
              <li key={f.id}>
                <span className="font-medium">{f.target_date}</span> · {f.departments?.name}
                {f.profiles?.full_name ? ` · ${f.profiles.full_name}` : " · whole department"} — {f.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {breakSessions.length > 0 && (
        <div className="card mb-6 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Break monitoring</p>
          <div className="space-y-1 text-sm">
            {breakSessions.slice(0, 8).map((b: any) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{b.profiles?.full_name}</span>
                  <span className="text-slate-400"> ({b.profiles?.employee_code})</span>
                </span>
                <span className={b.flagged ? "text-red-600" : !b.ended_at ? "text-amber-600" : "text-slate-500"}>
                  {!b.ended_at ? "On break now" : `${b.duration_minutes ?? 0}m`}
                  {b.flagged && b.flag_reason ? ` · ${b.flag_reason}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {instances.length === 0 && <EmptyState message={`No checklists for ${date}.`} />}

      {Array.from(byDept.entries()).filter(([, d]) => d.instances.length > 0).map(([deptId, dept]) => (
        <section key={deptId} className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{dept.name}</h2>
            <FollowupButton departmentId={deptId} departmentName={dept.name} />
          </div>
          <div className="space-y-3">
            {dept.instances.map((inst: any) => {
              const tasks = (inst.checklist_tasks ?? []).sort((a: any, b: any) => a.title.localeCompare(b.title));
              const d = tasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
              const pct = tasks.length ? Math.round((d / tasks.length) * 100) : 0;
              const att = attMap[inst.profile_id];
              const withRemarks = tasks.filter((t: any) => t.employee_remarks);
              const blockedTasks = tasks.filter((t: any) => t.blocked);
              return (
                <details key={inst.id} className="card group p-0">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {inst.profiles?.full_name}
                        <span className="ml-1 text-xs text-slate-400">({inst.profiles?.employee_code}) · {inst.shifts?.name}</span>
                        {att?.flagged && <span className="ml-2 text-xs text-red-500">⚠ off-site</span>}
                        {att?.status === "late" && <span className="ml-2 text-xs text-amber-500">late {att.late_minutes}m</span>}
                      </p>
                      <div className="mt-1.5 max-w-md"><Bar pct={pct} color={pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"} /></div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">{d}/{tasks.length}</span>
                      {blockedTasks.length > 0 && <span className="text-xs font-medium text-red-500">{blockedTasks.length} blocked</span>}
                      {withRemarks.length > 0 && <span className="text-xs text-blue-500">{withRemarks.length} note(s)</span>}
                      <FollowupButton departmentId={deptId} departmentName={dept.name}
                        profileId={inst.profile_id} profileName={inst.profiles?.full_name} small />
                    </div>
                  </summary>
                  <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                    {tasks.map((t: any) => (
                      <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{t.title}
                            {t.is_overdue && <span className="ml-2 text-xs text-red-500">overdue</span>}
                            {t.blocked && <span className="ml-2 text-xs font-medium text-red-500">can't complete</span>}
                          </p>
                          {t.blocked_reason && <p className="text-xs font-medium text-red-600 dark:text-red-300">Reason: {t.blocked_reason}</p>}
                          {t.employee_remarks && <p className="text-xs text-blue-600 dark:text-blue-400">💬 {t.employee_remarks}</p>}
                          {t.supervisor_remarks && <p className="text-xs text-slate-400">Sup: {t.supervisor_remarks}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {t.completed_at && <span className="text-xs text-slate-400">{fmtTime(t.completed_at)}{t.duration_minutes != null ? ` · ${t.duration_minutes}m` : ""}</span>}
                          <Badge value={t.status} />
                          {t.status === "completed" && <InlineVerify taskId={t.id} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
