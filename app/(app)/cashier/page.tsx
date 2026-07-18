import { requireProfile, isManagerUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr, fmtTime } from "@/lib/tz";
import { PageHeader, Badge, EmptyState, StatCard, Table } from "@/components/ui";
import { BranchFilter } from "@/components/branch-filter";
import { CashierForm } from "./cashier-form";

export const dynamic = "force-dynamic";

const money = (value: number | null | undefined) =>
  `AED ${Number(value ?? 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function CashierPage({ searchParams }: { searchParams: { date?: string; branch?: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const date = searchParams.date ?? todayStr();
  const selectedBranch = isManagerUp(profile.role) && searchParams.branch && searchParams.branch !== "all" ? searchParams.branch : null;

  let reportsQuery = supabase
    .from("cash_reports")
    .select("*, profiles!cash_reports_submitted_by_fkey(full_name, employee_code), stores(name)")
    .eq("report_date", date)
    .order("created_at", { ascending: false });
  if (selectedBranch) reportsQuery = reportsQuery.eq("store_id", selectedBranch);
  if (!isManagerUp(profile.role)) reportsQuery = reportsQuery.eq("store_id", profile.store_id);
  let groomersQuery = supabase.from("profiles")
    .select("id, full_name, employee_code, store_id, department_assignments!inner(departments!inner(code))")
    .eq("status", "active")
    .neq("role", "super_admin")
    .neq("employee_code", "BOSSG")
    .eq("department_assignments.departments.code", "GROOM")
    .order("full_name");
  if (selectedBranch) groomersQuery = groomersQuery.eq("store_id", selectedBranch);
  if (!isManagerUp(profile.role)) groomersQuery = groomersQuery.eq("store_id", profile.store_id);

  const [{ data: reports }, { data: branches }, { data: staff }, groomersRes] = await Promise.all([
    reportsQuery,
    isManagerUp(profile.role)
      ? supabase.from("stores").select("id, name, code").eq("is_active", true).order("name")
      : Promise.resolve({ data: [] } as any),
    supabase.from("profiles")
      .select("id, full_name, employee_code")
      .eq("status", "active")
      .eq("store_id", selectedBranch ?? profile.store_id)
      .neq("role", "super_admin")
      .neq("employee_code", "BOSSG")
      .order("full_name"),
    groomersQuery,
  ]);

  const rows = (reports ?? []) as any[];
  const totals = rows.reduce((acc, r) => ({
    cash_sales: acc.cash_sales + Number(r.cash_sales ?? 0),
    card_sales: acc.card_sales + Number(r.card_sales ?? 0),
    tips: acc.tips + Number(r.tips ?? 0),
    expenses: acc.expenses + Number(r.expenses ?? 0),
  }), { cash_sales: 0, card_sales: 0, tips: 0, expenses: 0 });

  return (
    <div>
      <PageHeader title="Cashier Cash Report" subtitle="Opening, shift-change, and closing money log."
        action={
          isManagerUp(profile.role)
            ? <BranchFilter branches={branches ?? []} selected={selectedBranch ?? "all"} includeDate date={date} />
            : (
              <form className="flex gap-2">
                <input type="date" name="date" defaultValue={date} className="input !w-auto" />
                <button className="btn-secondary">Go</button>
              </form>
            )
        } />

      <CashierForm today={date} staff={staff ?? []} groomers={groomersRes.data ?? []} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Cash Drop" value={money(totals.cash_sales)} />
        <StatCard label="Card Sales" value={money(totals.card_sales)} />
        <StatCard label="Tips" value={money(totals.tips)} />
        <StatCard label="Expenses" value={money(totals.expenses)} />
      </div>

      {rows.length === 0 ? (
        <EmptyState message={`No cash reports for ${date}.`} />
      ) : (
        <Table headers={["Time", "Phase", "Branch", "Submitted By", "Turnover", "Balanced", "Float", "Cash", "Card", "Variance", "Reason"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="td">{fmtTime(r.created_at)}</td>
              <td className="td"><Badge value={r.phase} /></td>
              <td className="td text-xs">{r.stores?.name ?? "—"}</td>
              <td className="td">
                {isManagerUp(profile.role)
                  ? `${r.profiles?.full_name ?? "Unknown"} (${r.profiles?.employee_code ?? "—"})`
                  : "Me"}
              </td>
              <td className="td text-xs">{staff?.find((s: any) => s.id === r.turnover_to)?.full_name ?? "—"}</td>
              <td className="td">{r.received_correct == null ? "—" : r.received_correct ? "Yes" : "No"}</td>
              <td className="td">{money(r.phase === "opening" ? r.opening_float : r.closing_float)}</td>
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
  );
}
