import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInspectionPassword } from "@/lib/public-sheets-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  if (!isInspectionPassword(body.password)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const inspectionDate = String(body.inspection_date ?? "");
  const inspectorName = String(body.inspector_name ?? "").trim();
  const inspectionShift = String(body.inspection_shift ?? "").trim();
  const items = Array.isArray(body.items) ? body.items : [];
  if (!inspectionDate) return NextResponse.json({ error: "Inspection date is required." }, { status: 400 });
  if (!inspectorName) return NextResponse.json({ error: "Inspector name is required." }, { status: 400 });
  if (!inspectionShift) return NextResponse.json({ error: "Choose inspection shift." }, { status: 400 });
  if (items.length === 0) return NextResponse.json({ error: "No animals to inspect." }, { status: 400 });

  const admin = createAdminClient();
  const { data: store, error: storeError } = await admin.from("stores")
    .select("id")
    .eq("code", "SPRINGS")
    .single();
  if (storeError || !store) return NextResponse.json({ error: "Springs branch not found." }, { status: 500 });

  const rows = items.map((item: any) => ({
    store_id: store.id,
    inspection_date: inspectionDate,
    kennel_report_id: String(item.report_id ?? ""),
    row_id: String(item.row_id ?? ""),
    category: String(item.category ?? ""),
    pet_type: String(item.pet_type ?? ""),
    animal_name: String(item.animal_name ?? "").trim() || null,
    cage_number: String(item.cage_number ?? "").trim() || null,
    inspector_name: inspectorName,
    inspection_shift: inspectionShift,
    feeding_ok: Boolean(item.feeding_ok),
    cleaning_ok: Boolean(item.cleaning_ok),
    walking_ok: item.pet_type === "Dog" ? Boolean(item.walking_ok) : null,
    status: item.status === "needs_attention" ? "needs_attention" : "ok",
    remarks: String(item.remarks ?? "").trim() || null,
    action_needed: String(item.action_needed ?? "").trim() || null,
  })).filter((item: any) => item.kennel_report_id && item.row_id && item.pet_type);

  if (rows.length === 0) return NextResponse.json({ error: "No valid animals to inspect." }, { status: 400 });

  const { error } = await admin.from("kennel_inspections").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: rows.length });
}
