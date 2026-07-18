"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const phases = new Set(["opening", "shift_change", "closing"]);

function money(fd: FormData, key: string) {
  const value = String(fd.get(key) ?? "").trim();
  return value === "" ? null : Number(value);
}

function moneyOrZero(fd: FormData, key: string) {
  return Number(money(fd, key) ?? 0);
}

export async function submitCashReport(fd: FormData) {
  const supabase = createAdminClient();

  const phase = String(fd.get("phase") ?? "");
  const reportDate = String(fd.get("report_date") ?? "");
  const storeId = String(fd.get("store_id") ?? "");
  const submittedBy = String(fd.get("submitted_by") ?? "");
  const turnoverTo = String(fd.get("turnover_to") ?? "") || null;
  if (!phases.has(phase)) return { error: "Choose a report phase." };
  if (!reportDate) return { error: "Choose a report date." };
  if (!storeId) return { error: "Choose a branch." };
  if (!submittedBy) return { error: "Choose who is submitting the till." };

  const { data: groomAssignments } = await supabase
    .from("department_assignments")
    .select("profile_id, departments!inner(code)")
    .eq("departments.code", "GROOM");
  const groomerIds = new Set((groomAssignments ?? []).map((row: any) => row.profile_id));

  const { data: allowedStaff, error: staffError } = await supabase
    .from("profiles")
    .select("id, full_name, employee_code, role, store_id")
    .eq("status", "active")
    .eq("store_id", storeId)
    .in("role", ["staff", "supervisor"])
    .neq("employee_code", "BOSSG");
  if (staffError) return { error: staffError.message };
  const allowed = (allowedStaff ?? []).filter((s: any) => !groomerIds.has(s.id));
  const allowedIds = new Set(allowed.map((s: any) => s.id));
  if (!allowedIds.has(submittedBy)) return { error: "Choose a cashier/shop staff member." };
  if (turnoverTo && !allowedIds.has(turnoverTo)) return { error: "Handover must be to cashier/shop staff only." };

  const hikeCash = moneyOrZero(fd, "expected_cash");
  const actualCash = moneyOrZero(fd, "counted_cash");
  const hikeCard = moneyOrZero(fd, "expected_card");
  const actualCard = moneyOrZero(fd, "actual_card");
  const cardTips = moneyOrZero(fd, "card_tip_amount");
  const expenses = moneyOrZero(fd, "expenses");
  const cashVariance = actualCash - (hikeCash - cardTips - expenses);
  const cardVariance = actualCard - (hikeCard + cardTips);
  const totalVariance = cashVariance + cardVariance;
  const openingFloat = money(fd, "opening_float");
  const closingFloat = money(fd, "closing_float");
  const floatVariance = openingFloat != null && closingFloat != null ? Number((closingFloat - openingFloat).toFixed(2)) : null;
  const expenseVendor = String(fd.get("expense_vendor") ?? "").trim();
  const expenseVendorCustom = String(fd.get("expense_vendor_custom") ?? "").trim();
  const expenseName = expenseVendor === "Custom" ? expenseVendorCustom : expenseVendor;
  const expenseReason = String(fd.get("expense_reason") ?? "").trim();
  const cardTipGroomer = String(fd.get("card_tip_groomer") ?? "").trim();
  const cashierNotes = [
    cardTips ? `Card tips: AED ${cardTips.toFixed(2)}${cardTipGroomer ? ` for ${cardTipGroomer}` : ""}` : "",
    expenses ? `Expense: AED ${expenses.toFixed(2)}${expenseName ? ` at ${expenseName}` : ""}${expenseReason ? ` - ${expenseReason}` : ""}` : "",
    String(fd.get("notes") ?? "").trim(),
  ].filter(Boolean).join("\n");
  const varianceSummary = [
    floatVariance != null ? `Float variance: AED ${floatVariance.toFixed(2)}` : "",
    `Auto cash variance: AED ${cashVariance.toFixed(2)}`,
    `Auto card variance: AED ${cardVariance.toFixed(2)}`,
    `Total variance: AED ${totalVariance.toFixed(2)}`,
  ].filter(Boolean).join("\n");

  const row = {
    store_id: storeId,
    report_date: reportDate,
    phase,
    opening_float: openingFloat,
    closing_float: closingFloat,
    cash_sales: money(fd, "cash_sales"),
    card_sales: money(fd, "card_sales"),
    tips: money(fd, "tips"),
    expenses: money(fd, "expenses"),
    turnover_to: turnoverTo,
    received_correct: Math.abs(totalVariance) < 0.01 && (floatVariance == null || Math.abs(floatVariance) < 0.01),
    expected_cash: money(fd, "expected_cash"),
    counted_cash: money(fd, "counted_cash"),
    missing_amount: Number(totalVariance.toFixed(2)),
    expected_card: money(fd, "expected_card"),
    actual_card: money(fd, "actual_card"),
    card_variance: Number(cardVariance.toFixed(2)),
    card_tip_amount: money(fd, "card_tip_amount"),
    shop_purchase_amount: money(fd, "shop_purchase_amount"),
    variance_reason: varianceSummary,
    expense_notes: expenses ? `${expenseName || "Expense"}${expenseReason ? ` - ${expenseReason}` : ""}` : null,
    notes: cashierNotes || null,
    submitted_by: submittedBy,
  };

  const { error } = await supabase.from("cash_reports").insert(row);
  if (error) return { error: error.message };

  revalidatePath("/cashier");
  revalidatePath("/overview");
  return { ok: true };
}
