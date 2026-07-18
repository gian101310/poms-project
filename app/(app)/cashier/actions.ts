"use server";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
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
  const profile = await requireProfile();
  const supabase = createClient();

  const phase = String(fd.get("phase") ?? "");
  const reportDate = String(fd.get("report_date") ?? "");
  if (!phases.has(phase)) return { error: "Choose a report phase." };
  if (!reportDate) return { error: "Choose a report date." };

  const hikeCash = moneyOrZero(fd, "expected_cash");
  const actualCash = moneyOrZero(fd, "counted_cash");
  const hikeCard = moneyOrZero(fd, "expected_card");
  const actualCard = moneyOrZero(fd, "actual_card");
  const cardTips = moneyOrZero(fd, "card_tip_amount");
  const expenses = moneyOrZero(fd, "expenses");
  const cashVariance = actualCash - (hikeCash - cardTips - expenses);
  const cardVariance = actualCard - (hikeCard + cardTips);
  const totalVariance = cashVariance + cardVariance;
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
    `Auto cash variance: AED ${cashVariance.toFixed(2)}`,
    `Auto card variance: AED ${cardVariance.toFixed(2)}`,
    `Total variance: AED ${totalVariance.toFixed(2)}`,
  ].join("\n");

  const row = {
    store_id: profile.store_id,
    report_date: reportDate,
    phase,
    opening_float: money(fd, "opening_float"),
    closing_float: money(fd, "closing_float"),
    cash_sales: money(fd, "cash_sales"),
    card_sales: money(fd, "card_sales"),
    tips: money(fd, "tips"),
    expenses: money(fd, "expenses"),
    turnover_to: String(fd.get("turnover_to") ?? "") || null,
    received_correct: Math.abs(totalVariance) < 0.01,
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
    submitted_by: profile.id,
  };

  const { error } = await supabase.from("cash_reports").insert(row);
  if (error) return { error: error.message };

  revalidatePath("/cashier");
  revalidatePath("/overview");
  return { ok: true };
}
