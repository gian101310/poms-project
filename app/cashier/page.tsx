import { createAdminClient } from "@/lib/supabase/admin";
import { todayStr, fmtDateTime, fmtTime } from "@/lib/tz";
import { PageHeader, Badge, EmptyState, StatCard } from "@/components/ui";
import { BranchFilter } from "@/components/branch-filter";
import { CashierForm } from "./cashier-form";

export const dynamic = "force-dynamic";

const money = (value: number | null | undefined) =>
  `AED ${Number(value ?? 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function CashierPage({ searchParams }: { searchParams: { date?: string; branch?: string } }) {
  const supabase = createAdminClient();
  const date = searchParams.date ?? todayStr();
  const { data: branches } = await supabase
    .from("stores")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");
  const defaultBranch = branches?.find((branch: any) => branch.code === "SPRINGS") ?? branches?.[0];
  const selectedBranch = searchParams.branch && searchParams.branch !== "all" ? searchParams.branch : defaultBranch?.id;

  const reportsQuery = supabase
    .from("cash_reports")
    .select("*, profiles!cash_reports_submitted_by_fkey(full_name, employee_code), turnover:profiles!cash_reports_turnover_to_fkey(full_name, employee_code), stores(name)")
    .eq("report_date", date)
    .eq("store_id", selectedBranch)
    .order("created_at", { ascending: false });

  const groomersQuery = supabase.from("profiles")
    .select("id, full_name, employee_code, store_id, department_assignments!inner(departments!inner(code))")
    .eq("status", "active")
    .neq("role", "super_admin")
    .neq("employee_code", "BOSSG")
    .eq("department_assignments.departments.code", "GROOM")
    .eq("store_id", selectedBranch)
    .order("full_name");

  const [{ data: reports }, groomersRes, { data: groomAssignments }, { data: rawStaff }, { data: previousClosing }] = await Promise.all([
    reportsQuery,
    groomersQuery,
    supabase
      .from("department_assignments")
      .select("profile_id, departments!inner(code)")
      .eq("departments.code", "GROOM"),
    supabase
      .from("profiles")
      .select("id, full_name, employee_code, role")
      .eq("status", "active")
      .eq("store_id", selectedBranch)
      .in("role", ["staff", "supervisor"])
      .neq("role", "super_admin")
      .neq("employee_code", "BOSSG")
      .order("full_name"),
    supabase
      .from("cash_reports")
      .select("closing_float, created_at")
      .eq("store_id", selectedBranch)
      .eq("phase", "closing")
      .lt("report_date", date)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const groomerIds = new Set((groomAssignments ?? []).map((row: any) => row.profile_id));
  const staff = (rawStaff ?? []).filter((s: any) => !groomerIds.has(s.id));
  const rows = (reports ?? []) as any[];
  const totals = rows.reduce((acc, r) => ({
    cash_sales: acc.cash_sales + Number(r.cash_sales ?? 0),
    card_sales: acc.card_sales + Number(r.card_sales ?? 0),
    tips: acc.tips + Number(r.tips ?? 0),
    expenses: acc.expenses + Number(r.expenses ?? 0),
  }), { cash_sales: 0, card_sales: 0, tips: 0, expenses: 0 });
  const sortedRows = [...rows].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const openingRow = sortedRows.find((row) => row.phase === "opening");
  const closingRow = [...sortedRows].reverse().find((row) => row.phase === "closing");
  const openingFloat = openingRow?.opening_float ?? null;
  const closingFloat = closingRow?.closing_float ?? null;
  const floatVariance = openingFloat != null && closingFloat != null ? Number(closingFloat) - Number(openingFloat) : null;
  const previousFloatVariance = previousClosing?.closing_float != null && openingFloat != null
    ? Number(openingFloat) - Number(previousClosing.closing_float)
    : null;
  const opener = openingRow?.profiles
    ? `${openingRow.profiles.full_name} (${openingRow.profiles.employee_code ?? "-"})`
    : "Waiting";
  const closer = closingRow?.profiles
    ? `${closingRow.profiles.full_name} (${closingRow.profiles.employee_code ?? "-"})`
    : "Waiting";
  const flaggedRows = rows.filter((row) => flagFor(row) !== "Clear");

  function flagFor(row: any) {
    const flags = [];
    if (row.received_correct === false) flags.push("Discrepancy");
    if (Math.abs(Number(row.missing_amount ?? 0)) >= 0.01) flags.push(`Cash/card ${money(row.missing_amount)}`);
    if (row.phase === "opening" && previousFloatVariance != null && Math.abs(previousFloatVariance) >= 0.01) {
      flags.push(`Prev close ${money(previousFloatVariance)}`);
    }
    if (row.phase === "closing" && openingFloat != null && row.closing_float != null) {
      const dayFloatVariance = Number(row.closing_float) - Number(openingFloat);
      if (Math.abs(dayFloatVariance) >= 0.01) flags.push(`Open/close ${money(dayFloatVariance)}`);
    }
    if (row.opening_float != null && row.closing_float != null && Math.abs(Number(row.closing_float) - Number(row.opening_float)) >= 0.01) {
      flags.push(`Float ${money(Number(row.closing_float) - Number(row.opening_float))}`);
    }
    return flags.length ? flags.join(" · ") : "Clear";
  }

  function person(profile: any) {
    return profile?.full_name ? `${profile.full_name} (${profile.employee_code ?? "-"})` : "-";
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100 md:p-6">
      <div className="mx-auto max-w-7xl">
      <PageHeader title="Cashier Cash Report" subtitle="Opening, shift-change, and closing money log."
        action={<BranchFilter branches={branches ?? []} selected={selectedBranch ?? "all"} includeDate date={date} />} />

      {selectedBranch ? (
        <CashierForm today={date} storeId={selectedBranch} staff={staff} groomers={groomersRes.data ?? []} />
      ) : (
        <EmptyState message="No active branch found." />
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Cash Drop" value={money(totals.cash_sales)} />
        <StatCard label="Card Sales" value={money(totals.card_sales)} />
        <StatCard label="Tips" value={money(totals.tips)} />
        <StatCard label="Expenses" value={money(totals.expenses)} />
      </div>
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Opening vs Closing Float" value={floatVariance == null ? "Waiting" : money(floatVariance)} hint="Should be AED 0.00." />
        <StatCard label="Last Closing vs Opening" value={previousFloatVariance == null ? "Waiting" : money(previousFloatVariance)} hint="Checks yesterday closing against today opening." />
        <StatCard label="Today Logs" value={rows.length} hint="Discrepancies are flagged below after submit." />
      </div>
      <div className="card mb-6 grid gap-3 p-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opened by</p>
          <p className="mt-1 font-semibold">{opener}</p>
          <p className="text-xs text-slate-400">{openingRow ? fmtDateTime(openingRow.created_at) : "No opening log yet"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Closed by</p>
          <p className="mt-1 font-semibold">{closer}</p>
          <p className="text-xs text-slate-400">{closingRow ? fmtDateTime(closingRow.created_at) : "No closing log yet"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audit flags</p>
          <p className={flaggedRows.length ? "mt-1 text-lg font-bold text-red-600" : "mt-1 text-lg font-bold text-green-600"}>
            {flaggedRows.length ? `${flaggedRows.length} needs review` : "Clear"}
          </p>
          <p className="text-xs text-slate-400">Use this for next-day audit.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState message={`No cash reports for ${date}.`} />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const flag = flagFor(r);
            return (
              <details key={r.id} className={`card p-0 ${flag === "Clear" ? "" : "border-red-200 dark:border-red-900"}`}>
                <summary className="grid cursor-pointer gap-3 p-4 marker:text-slate-400 md:grid-cols-[120px_140px_1fr_1fr_1.4fr]">
                  <div>
                    <p className="text-xs text-slate-400">Date / time</p>
                    <p className="font-semibold">{fmtTime(r.created_at)}</p>
                    <p className="text-xs text-slate-400">{fmtDateTime(r.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Phase</p>
                    <Badge value={r.phase} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{r.phase === "opening" ? "Opened by" : r.phase === "closing" ? "Closed by" : "Submitted by"}</p>
                    <p className="font-semibold">{person(r.profiles)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Handover</p>
                    <p>{person(r.turnover)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Audit flag</p>
                    <p className={flag === "Clear" ? "font-semibold text-green-600" : "font-semibold text-red-600"}>{flag}</p>
                  </div>
                </summary>
                <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-400">Branch</p>
                      <p className="font-semibold">{r.stores?.name ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Opening float</p>
                      <p className="font-semibold">{money(r.opening_float)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Closing float</p>
                      <p className="font-semibold">{money(r.closing_float)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Balanced</p>
                      <p className={r.received_correct === false ? "font-semibold text-red-600" : "font-semibold text-green-600"}>{r.received_correct ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Hike cash</p>
                      <p className="font-semibold">{money(r.expected_cash)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Actual cash / drop</p>
                      <p className="font-semibold">{money(r.counted_cash ?? r.cash_sales)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Hike card</p>
                      <p className="font-semibold">{money(r.expected_card)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Actual card machine</p>
                      <p className="font-semibold">{money(r.actual_card ?? r.card_sales)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Card tips</p>
                      <p className="font-semibold">{money(r.card_tip_amount ?? r.tips)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Expenses</p>
                      <p className="font-semibold">{money(r.shop_purchase_amount ?? r.expenses)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Cash/card variance</p>
                      <p className={Math.abs(Number(r.missing_amount ?? 0)) >= 0.01 ? "font-semibold text-red-600" : "font-semibold text-green-600"}>{money(r.missing_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Card variance</p>
                      <p className={Math.abs(Number(r.card_variance ?? 0)) >= 0.01 ? "font-semibold text-red-600" : "font-semibold text-green-600"}>{money(r.card_variance)}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-400">Expense notes</p>
                      <p className="whitespace-pre-wrap text-sm">{r.expense_notes || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Variance details</p>
                      <p className="whitespace-pre-wrap text-sm">{r.variance_reason || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Staff notes</p>
                      <p className="whitespace-pre-wrap text-sm">{r.notes || "-"}</p>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
      </div>
    </main>
  );
}
