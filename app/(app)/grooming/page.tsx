import { requireProfile, isManagerUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr, fmtTime } from "@/lib/tz";
import { PageHeader, StatCard, Badge, EmptyState, Bar } from "@/components/ui";
import { BranchFilter } from "@/components/branch-filter";
import { GroomingActions, GroomingBookingForm } from "./grooming-client";

export const dynamic = "force-dynamic";

export default async function GroomingPage({ searchParams }: { searchParams: { date?: string; branch?: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const date = searchParams.date ?? todayStr();
  const canAssign = isManagerUp(profile.role);
  const selectedBranch = canAssign && searchParams.branch && searchParams.branch !== "all" ? searchParams.branch : null;

  let groomersQuery = supabase.from("profiles")
    .select("id, full_name, employee_code, store_id, department_assignments!inner(departments!inner(code))")
    .eq("status", "active")
    .eq("department_assignments.departments.code", "GROOM")
    .order("full_name");
  if (selectedBranch) groomersQuery = groomersQuery.eq("store_id", selectedBranch);
  const [groomersRes, branchesRes] = await Promise.all([
    groomersQuery,
    canAssign ? supabase.from("stores").select("id, name, code").eq("is_active", true).order("name") : Promise.resolve({ data: [] } as any),
  ]);
  const groomers = groomersRes.data ?? [];
  const isGroomer = groomers.some((g: any) => g.id === profile.id);

  let bookingQuery = supabase.from("grooming_bookings")
    .select("*, profiles!grooming_bookings_assigned_groomer_id_fkey(full_name, employee_code)")
    .eq("booking_date", date)
    .order("appointment_time", { ascending: true });
  if (!canAssign) bookingQuery = bookingQuery.eq("assigned_groomer_id", profile.id);
  if (selectedBranch) bookingQuery = bookingQuery.eq("store_id", selectedBranch);
  const bookingsRes = await bookingQuery;

  const monthStart = `${date.slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  let monthQuery = supabase.from("grooming_bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("booking_date", monthStart)
    .lt("booking_date", nextMonth.toISOString().slice(0, 10));
  if (!canAssign) monthQuery = monthQuery.eq("assigned_groomer_id", profile.id);
  if (selectedBranch) monthQuery = monthQuery.eq("store_id", selectedBranch);
  const monthRes = await monthQuery;

  const bookings = bookingsRes.error ? [] : (bookingsRes.data ?? []);
  const booked = bookings.length;
  const confirmed = bookings.filter((b: any) => ["confirmed", "completed"].includes(b.status)).length;
  const completed = bookings.filter((b: any) => b.status === "completed").length;
  const paid = bookings.filter((b: any) => b.payment_status === "paid").length;
  const progress = booked ? Math.round((completed / booked) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Grooming"
        subtitle={canAssign ? "Daily bookings, calls, completion, and payment status" : "Your grooming bookings for today"}
        action={
          <div className="flex flex-wrap gap-2">
            {canAssign
              ? <BranchFilter branches={branchesRes.data ?? []} selected={selectedBranch ?? "all"} includeDate date={date} />
              : (
                <form className="flex gap-2">
                  <input type="date" name="date" defaultValue={date} className="input !w-auto" />
                  <button className="btn-secondary">Go</button>
                </form>
              )}
            {(canAssign || isGroomer) && <GroomingBookingForm groomers={groomers} defaultDate={date} canAssign={canAssign} />}
          </div>
        }
      />

      {bookingsRes.error ? (
        <div className="card border-l-4 border-l-amber-500 p-4 text-sm text-amber-700">
          Run migration 016 to enable grooming bookings.
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label="Booked Today" value={booked} />
            <StatCard label="Confirmed" value={confirmed} />
            <StatCard label="Completed" value={completed} />
            <StatCard label="Paid" value={`${paid}/${booked}`} />
            <StatCard label="Completed This Month" value={monthRes.count ?? 0} />
          </div>

          <div className="card mb-6 p-4">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Daily grooming progress</span>
              <span>{completed}/{booked} completed</span>
            </div>
            <Bar pct={progress} color={progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-amber-500" : "bg-red-500"} />
          </div>

          {bookings.length === 0 ? (
            <EmptyState message="No grooming bookings for this date." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {bookings.map((b: any) => (
                <div key={b.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {b.appointment_time ? fmtTime(`${b.booking_date}T${b.appointment_time}`) : "Any time"} · {b.client_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {b.client_phone} · {b.pet_name ? `${b.pet_name} · ` : ""}{b.pet_type}{b.dog_breed ? ` · ${b.dog_breed}` : ""}
                      </p>
                      {canAssign && <p className="mt-1 text-xs text-slate-500">Groomer: {b.profiles?.full_name}</p>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Badge value={b.status} />
                      <Badge value={b.payment_status} />
                    </div>
                  </div>
                  {b.service_notes && <p className="mt-2 text-sm text-slate-500">{b.service_notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    {b.confirmed_at && <span>Confirmed {fmtTime(b.confirmed_at)}</span>}
                    {b.completed_at && <span>Done {fmtTime(b.completed_at)}</span>}
                    {b.finish_called_at && <span>Finish call {fmtTime(b.finish_called_at)}</span>}
                    {b.cannot_call_reason && <span className="font-medium text-amber-600">Cannot call: {b.cannot_call_reason}</span>}
                  </div>
                  <div className="mt-3">
                    <GroomingActions booking={b} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
