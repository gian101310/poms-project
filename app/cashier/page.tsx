import { createAdminClient } from "@/lib/supabase/admin";
import { todayStr, fmtTime } from "@/lib/tz";
import { PageHeader, Badge, EmptyState, StatCard, Table } from "@/components/ui";
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
    .select("*, profiles!cash_reports_submitted_by_fkey(full_name, employee_code), stores(name)")
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

      {rows.length === 0 ? (
        <EmptyState message={`No cash reports for ${date}.`} />
      ) : (
        <Table headers={["Time", "Phase", "Branch", "Submitted By", "Handover", "Flag", "Float", "Cash", "Card", "Variance", "Reason"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="td">{fmtTime(r.created_at)}</td>
              <td className="td"><Badge value={r.phase} /></td>
              <td className="td text-xs">{r.stores?.name ?? "—"}</td>
              <td className="td">
                {`${r.profiles?.full_name ?? "Unknown"} (${r.profiles?.employee_code ?? "—"})`}
              </td>
              <td className="td text-xs">{staff.find((s: any) => s.id === r.turnover_to)?.full_name ?? "—"}</td>
              <td className={r.received_correct === false ? "td font-semibold text-red-600" : "td text-green-600"}>{flagFor(r)}</td>
              <td className="td">
                <p>Open {money(r.opening_float)}</p>
                <p className="text-xs text-slate-400">Close {money(r.closing_float)}</p>
              </td>
              <td className="td">
                <p>{money(r.counted_cash ?? r.cash_sales)}</p>
                {(r.expected_cash != null || r.counted_cash != null) && <p className="text-xs text-slate-400">Hike {money(r.expected_cash)} · Actual {money(r.counted_cash)}</p>}
              </td>
              <td className="td">
                <p>{money(r.actual_card ?? r.card_sales)}</p>
                {(r.expected_card != null || r.actual_card != null) && <p className="text-xs text-slate-400">Hike {money(r.expected_card)} · Actual {money(r.actual_card)}</p>}
              </td>
              <td className="td">
                <p>{money(r.missing_amount)}</p>
                {r.card_variance != null && <p className="text-xs text-slate-400">Card {money(r.card_variance)}</p>}
                {r.card_tip_amount != null && <p className="text-xs text-slate-400">Tips card {money(r.card_tip_amount)}</p>}
                {r.shop_purchase_amount != null && <p className="text-xs text-slate-400">Shop buy {money(r.shop_purchase_amount)}</p>}
              </td>
              <td className="td max-w-[260px] truncate">{r.variance_reason || r.expense_notes || r.notes || "—"}</td>
            </tr>
          ))}
        </Table>
      )}
      </div>
    </main>
  );
}
