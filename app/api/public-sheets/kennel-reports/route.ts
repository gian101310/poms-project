import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const categories = new Set(["dogs", "cats", "birds", "reptiles", "small_animals"]);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const category = String(body.category ?? "");
  const reportDate = String(body.report_date ?? "");
  const submittedByProfileId = String(body.submitted_by_profile_id ?? "");
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (!categories.has(category)) return NextResponse.json({ error: "Choose a valid boarding page." }, { status: 400 });
  if (!reportDate) return NextResponse.json({ error: "Report date is required." }, { status: 400 });
  if (!submittedByProfileId) return NextResponse.json({ error: "Choose staff name." }, { status: 400 });

  const cleanRows = rows
    .map((row: any, index: number) => ({
      row_id: String(row.row_id ?? `${Date.now()}-${index}`),
      label: `Boarding ${index + 1}`,
      pet_type: String(row.pet_type ?? "").trim(),
      animal_name: String(row.animal_name ?? "").trim(),
      received_by: String(row.received_by ?? "").trim(),
      breed: String(row.breed ?? "").trim(),
      size: String(row.size ?? "").trim(),
      cage_color: String(row.cage_color ?? "").trim(),
      cage_number: String(row.cage_number ?? "").trim(),
      client_number: String(row.client_number ?? "").trim(),
      check_in_date: String(row.check_in_date ?? "").trim(),
      checkout_date: String(row.checkout_date ?? "").trim(),
      payment_status: ["fully paid", "partially paid", "unpaid", "paid"].includes(String(row.payment_status ?? "").toLowerCase())
        ? String(row.payment_status).toLowerCase()
        : "unpaid",
      boarding_days: Number.isFinite(Number(row.boarding_days)) ? Number(row.boarding_days) : 0,
      paid_days_mode: ["full", "half", "custom"].includes(String(row.paid_days_mode ?? "").toLowerCase())
        ? String(row.paid_days_mode).toLowerCase()
        : "full",
      paid_days: Number.isFinite(Number(row.paid_days)) ? Number(row.paid_days) : 0,
      extension_checkout_date: String(row.extension_checkout_date ?? "").trim(),
      extension_days: Number.isFinite(Number(row.extension_days)) ? Number(row.extension_days) : 0,
      extension_payment_status: ["fully paid", "partially paid", "unpaid", "paid"].includes(String(row.extension_payment_status ?? "").toLowerCase())
        ? String(row.extension_payment_status).toLowerCase()
        : "unpaid",
      invoice_numbers: String(row.invoice_numbers ?? "").trim(),
      extension_invoice_numbers: String(row.extension_invoice_numbers ?? "").trim(),
      overdue_days: Number.isFinite(Number(row.overdue_days)) ? Number(row.overdue_days) : 0,
      misc_note: String(row.misc_note ?? "").trim(),
      brought_items: typeof row.brought_items === "object" && row.brought_items !== null ? row.brought_items : {},
      health_status: String(row.health_status ?? "").trim(),
      report: String(row.report ?? "").trim(),
      feeding_done: Boolean(row.feeding_done),
      cleaning_done: Boolean(row.cleaning_done),
      walking_done: Boolean(row.walking_done),
      last_updated_by: String(row.last_updated_by ?? "").trim(),
      last_updated_at: String(row.last_updated_at ?? "").trim(),
    }))
    .filter((row: any) => row.pet_type || row.animal_name || row.breed || row.cage_number || row.client_number || row.check_in_date || row.checkout_date || row.report);

  if (cleanRows.length === 0) return NextResponse.json({ error: "Add at least one boarding animal." }, { status: 400 });

  const admin = createAdminClient();
  const { data: store, error: storeError } = await admin.from("stores")
    .select("id")
    .eq("code", "SPRINGS")
    .single();
  if (storeError || !store) return NextResponse.json({ error: "Springs branch not found." }, { status: 500 });

  const { data: staff, error: staffError } = await admin.from("profiles")
    .select("id, full_name, employee_code")
    .eq("id", submittedByProfileId)
    .eq("store_id", store.id)
    .eq("status", "active")
    .neq("role", "super_admin")
    .neq("employee_code", "BOSSG")
    .single();
  if (staffError || !staff) return NextResponse.json({ error: "Choose a valid Springs staff member." }, { status: 400 });

  const { data, error } = await admin.from("kennel_reports").insert({
    store_id: store.id,
    report_date: reportDate,
    category,
    submitted_by_profile_id: staff.id,
    submitted_by_name: `${staff.full_name} (${staff.employee_code})`,
    rows: cleanRows,
    total_animals: cleanRows.length,
    feeding_done: cleanRows.filter((row: any) => row.feeding_done).length,
    cleaning_done: cleanRows.filter((row: any) => row.cleaning_done).length,
    walking_done: cleanRows.filter((row: any) => row.walking_done).length,
  }).select("id, submitted_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, report: data });
}
