"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInspectionPassword } from "@/lib/public-sheets-auth";
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
  const closingFloat = phase === "opening" ? null : money(fd, "closing_float");
  const floatVariance = openingFloat != null && closingFloat != null ? Number((closingFloat - openingFloat).toFixed(2)) : null;
  const { data: standardFloatRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("store_id", storeId)
    .eq("key", "standard_cash_float")
    .maybeSingle();
  const standardFloat = standardFloatRow?.value == null ? null : Number(standardFloatRow.value);
  const activeFloat = phase === "closing" ? closingFloat : openingFloat;
  const standardFloatVariance = standardFloat != null && activeFloat != null
    ? Number((activeFloat - standardFloat).toFixed(2))
    : null;
  const { data: previousClosing } = phase === "opening" && openingFloat != null
    ? await supabase
      .from("cash_reports")
      .select("closing_float")
      .eq("store_id", storeId)
      .eq("phase", "closing")
      .lt("report_date", reportDate)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    : { data: null };
  const { data: todayOpening } = phase === "closing" && closingFloat != null
    ? await supabase
      .from("cash_reports")
      .select("opening_float")
      .eq("store_id", storeId)
      .eq("report_date", reportDate)
      .eq("phase", "opening")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    : { data: null };
  const { data: previousSameDayReport } = phase !== "opening" && openingFloat != null
    ? await supabase
      .from("cash_reports")
      .select("closing_float")
      .eq("store_id", storeId)
      .eq("report_date", reportDate)
      .not("closing_float", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    : { data: null };
  const previousFloatVariance = previousClosing?.closing_float != null && openingFloat != null
    ? Number((openingFloat - previousClosing.closing_float).toFixed(2))
    : null;
  const dayFloatVariance = todayOpening?.opening_float != null && closingFloat != null
    ? Number((closingFloat - todayOpening.opening_float).toFixed(2))
    : null;
  const shiftFloatVariance = previousSameDayReport?.closing_float != null && openingFloat != null
    ? Number((openingFloat - previousSameDayReport.closing_float).toFixed(2))
    : null;
  const expenseLines = String(fd.get("expense_lines") ?? "").trim();
  const tipLines = String(fd.get("tip_lines") ?? "").trim();
  const cashierNotes = [
    cardTips ? `Card tips total: AED ${cardTips.toFixed(2)}${tipLines ? `\n${tipLines}` : ""}` : "",
    expenses ? `Expenses total: AED ${expenses.toFixed(2)}${expenseLines ? `\n${expenseLines}` : ""}` : "",
    String(fd.get("notes") ?? "").trim(),
  ].filter(Boolean).join("\n");
  const varianceSummary = [
    floatVariance != null ? `Float variance: AED ${floatVariance.toFixed(2)}` : "",
    previousFloatVariance != null ? `Previous closing to opening variance: AED ${previousFloatVariance.toFixed(2)}` : "",
    dayFloatVariance != null ? `Opening to closing float variance: AED ${dayFloatVariance.toFixed(2)}` : "",
    shiftFloatVariance != null ? `Previous shift to current opening float variance: AED ${shiftFloatVariance.toFixed(2)}` : "",
    standardFloatVariance != null ? `Standard float variance: AED ${standardFloatVariance.toFixed(2)}` : "",
    phase !== "opening" ? `Auto cash variance: AED ${cashVariance.toFixed(2)}` : "",
    phase !== "opening" ? `Auto card variance: AED ${cardVariance.toFixed(2)}` : "",
    phase !== "opening" ? `Total variance: AED ${totalVariance.toFixed(2)}` : "",
  ].filter(Boolean).join("\n");
  const hasFloatDiscrepancy = [floatVariance, previousFloatVariance, dayFloatVariance, shiftFloatVariance, standardFloatVariance].some((value) => value != null && Math.abs(value) >= 0.01);

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
    received_correct: Math.abs(totalVariance) < 0.01 && !hasFloatDiscrepancy,
    expected_cash: money(fd, "expected_cash"),
    counted_cash: money(fd, "counted_cash"),
    missing_amount: Number(totalVariance.toFixed(2)),
    expected_card: money(fd, "expected_card"),
    actual_card: money(fd, "actual_card"),
    card_variance: Number(cardVariance.toFixed(2)),
    card_tip_amount: money(fd, "card_tip_amount"),
    shop_purchase_amount: money(fd, "shop_purchase_amount"),
    variance_reason: varianceSummary,
    expense_notes: expenses ? (expenseLines || `Expenses total: AED ${expenses.toFixed(2)}`) : null,
    notes: cashierNotes || null,
    submitted_by: submittedBy,
  };

  const { error } = await supabase.from("cash_reports").insert(row);
  if (error) return { error: error.message };

  revalidatePath("/cashier");
  revalidatePath("/overview");
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteCashReport(fd: FormData) {
  const supabase = createAdminClient();
  const id = String(fd.get("id") ?? "");
  const password = String(fd.get("admin_password") ?? "");
  if (!id) return { error: "Missing report id." };
  if (!isInspectionPassword(password)) return { error: "Wrong admin password." };

  const { error } = await supabase.from("cash_reports").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/cashier");
  revalidatePath("/overview");
  revalidatePath("/reports");
  return { ok: true };
}
