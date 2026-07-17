import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInspectionPassword } from "@/lib/public-sheets-auth";

export const dynamic = "force-dynamic";

function dateOffset(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const password = url.searchParams.get("password");
  if (!isInspectionPassword(password)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const reportDate = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const yesterday = dateOffset(reportDate, -1);
  const admin = createAdminClient();

  const { data: store, error: storeError } = await admin.from("stores")
    .select("id")
    .eq("code", "SPRINGS")
    .single();
  if (storeError || !store) return NextResponse.json({ error: "Springs branch not found." }, { status: 500 });

  const [{ data: reports, error: reportsError }, { data: inspections, error: inspectionsError }, { data: previous, error: previousError }] = await Promise.all([
    admin.from("kennel_reports")
      .select("id, report_date, category, submitted_by_name, submitted_at, rows")
      .eq("store_id", store.id)
      .eq("report_date", reportDate)
      .order("submitted_at", { ascending: true }),
    admin.from("kennel_inspections")
      .select("*")
      .eq("store_id", store.id)
      .eq("inspection_date", reportDate)
      .order("created_at", { ascending: false }),
    admin.from("kennel_inspections")
      .select("*")
      .eq("store_id", store.id)
      .eq("inspection_date", yesterday)
      .order("created_at", { ascending: false }),
  ]);

  if (reportsError) return NextResponse.json({ error: reportsError.message }, { status: 500 });
  if (inspectionsError && inspectionsError.code !== "42P01") return NextResponse.json({ error: inspectionsError.message }, { status: 500 });
  if (previousError && previousError.code !== "42P01") return NextResponse.json({ error: previousError.message }, { status: 500 });

  const latestByAnimal = new Map<string, any>();
  for (const item of inspections ?? []) {
    const key = `${item.kennel_report_id}:${item.row_id}`;
    if (!latestByAnimal.has(key)) latestByAnimal.set(key, item);
  }

  const animals = (reports ?? []).flatMap((report: any) =>
    (report.rows ?? []).map((row: any, index: number) => {
      const rowId = row.row_id ?? `${report.id}-${index}`;
      const key = `${report.id}:${rowId}`;
      return {
        key,
        report_id: report.id,
        row_id: rowId,
        report_date: report.report_date,
        category: report.category,
        submitted_by_name: report.submitted_by_name,
        submitted_at: report.submitted_at,
        label: row.label ?? `Boarding ${index + 1}`,
        pet_type: row.pet_type,
        animal_name: row.animal_name,
        breed: row.breed,
        client_number: row.client_number,
        cage_color: row.cage_color,
        cage_number: row.cage_number,
        checkout_date: row.checkout_date,
        payment_status: row.payment_status,
        health_status: row.health_status,
        report: row.report,
        feeding_done: Boolean(row.feeding_done),
        cleaning_done: Boolean(row.cleaning_done),
        walking_done: Boolean(row.walking_done),
        latest_inspection: latestByAnimal.get(key) ?? null,
      };
    })
  );

  const previousRows = previous ?? [];
  const issueRows = previousRows.filter((row: any) => row.status !== "ok" || row.action_needed || row.remarks);
  const yesterdaySummary = previousRows.length === 0
    ? "No inspection recorded yesterday."
    : issueRows.length === 0
      ? "Yesterday was ok."
      : `${issueRows.length} issue(s) from yesterday need attention.`;

  return NextResponse.json({ animals, yesterdaySummary, previousIssues: issueRows.slice(0, 12) });
}
