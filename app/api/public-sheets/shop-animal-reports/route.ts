import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const categories = new Set(["small_animals", "fish", "birds", "reptiles"]);

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const reportDate = String(body.report_date ?? "");
  const submittedByProfileId = String(body.submitted_by_profile_id ?? "");
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (!reportDate) return NextResponse.json({ error: "Report date is required." }, { status: 400 });
  if (!submittedByProfileId) return NextResponse.json({ error: "Choose staff name." }, { status: 400 });

  const cleanRows = rows
    .map((row: any, index: number) => ({
      row_id: String(row.row_id ?? `${Date.now()}-${index}`),
      label: `Shop Animal ${index + 1}`,
      shop_category: categories.has(String(row.shop_category ?? "")) ? String(row.shop_category) : "small_animals",
      pet_type: String(row.pet_type ?? "").trim(),
      animal_name: String(row.animal_name ?? "").trim(),
      breed: String(row.breed ?? "").trim(),
      display_area: String(row.display_area ?? "").trim(),
      cage_color: String(row.cage_color ?? "").trim(),
      cage_number: String(row.cage_number ?? "").trim(),
      quantity: Number.isFinite(Number(row.quantity)) ? Math.max(1, Number(row.quantity)) : 1,
      health_status: String(row.health_status ?? "").trim(),
      report: String(row.report ?? "").trim(),
      feeding_done: Boolean(row.feeding_done),
      cleaning_done: Boolean(row.cleaning_done),
    }))
    .filter((row: any) => row.pet_type || row.animal_name || row.breed || row.display_area || row.cage_number || row.report);

  if (cleanRows.length === 0) return NextResponse.json({ error: "Add at least one shop animal." }, { status: 400 });

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
    .single();
  if (staffError || !staff) return NextResponse.json({ error: "Choose a valid Springs staff member." }, { status: 400 });

  const { data, error } = await admin.from("shop_animal_reports").insert({
    store_id: store.id,
    report_date: reportDate,
    submitted_by_profile_id: staff.id,
    submitted_by_name: `${staff.full_name} (${staff.employee_code})`,
    rows: cleanRows,
    total_animals: cleanRows.reduce((sum: number, row: any) => sum + Number(row.quantity ?? 1), 0),
    feeding_done: cleanRows.filter((row: any) => row.feeding_done).length,
    cleaning_done: cleanRows.filter((row: any) => row.cleaning_done).length,
  }).select("id, submitted_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, report: data });
}
