"use server";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const phases = new Set(["opening", "shift_change", "closing"]);

function money(fd: FormData, key: string) {
  const value = String(fd.get(key) ?? "").trim();
  return value === "" ? null : Number(value);
}

export async function submitCashReport(fd: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();

  const phase = String(fd.get("phase") ?? "");
  const reportDate = String(fd.get("report_date") ?? "");
  if (!phases.has(phase)) return { error: "Choose a report phase." };
  if (!reportDate) return { error: "Choose a report date." };

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
    received_correct: fd.get("received_correct") === "" ? null : fd.get("received_correct") === "yes",
    expected_cash: money(fd, "expected_cash"),
    counted_cash: money(fd, "counted_cash"),
    missing_amount: money(fd, "missing_amount"),
    expected_card: money(fd, "expected_card"),
    actual_card: money(fd, "actual_card"),
    card_variance: money(fd, "card_variance"),
    card_tip_amount: money(fd, "card_tip_amount"),
    shop_purchase_amount: money(fd, "shop_purchase_amount"),
    variance_reason: String(fd.get("variance_reason") ?? "").trim() || null,
    expense_notes: String(fd.get("expense_notes") ?? "").trim() || null,
    notes: String(fd.get("notes") ?? "").trim() || null,
    submitted_by: profile.id,
  };

  const { error } = await supabase.from("cash_reports").insert(row);
  if (error) return { error: error.message };

  revalidatePath("/cashier");
  revalidatePath("/overview");
  return { ok: true };
}
