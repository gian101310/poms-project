import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInspectionPassword } from "@/lib/public-sheets-auth";

export const dynamic = "force-dynamic";

function isMissingTable(error: any) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

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

  const [
    { data: liveBoardingAnimals, error: liveBoardingError },
    { data: reports, error: reportsError },
    { data: shopReports, error: shopReportsError },
    { data: groomingBookings, error: groomingBookingsError },
    { data: inspections, error: inspectionsError },
    { data: shopInspections, error: shopInspectionsError },
    { data: groomingInspections, error: groomingInspectionsError },
    { data: previous, error: previousError },
    { data: previousShop, error: previousShopError },
    { data: previousGrooming, error: previousGroomingError },
  ] = await Promise.all([
    admin.from("public_boarding_animals")
      .select("id, category, row_data, updated_by_name, updated_at, created_by_name, created_at")
      .eq("store_id", store.id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
    admin.from("kennel_reports")
      .select("id, report_date, category, submitted_by_name, submitted_at, rows")
      .eq("store_id", store.id)
      .eq("report_date", reportDate)
      .order("submitted_at", { ascending: true }),
    admin.from("shop_animal_reports")
      .select("id, report_date, submitted_by_name, submitted_at, rows")
      .eq("store_id", store.id)
      .eq("report_date", reportDate)
      .order("submitted_at", { ascending: true }),
    admin.from("grooming_bookings")
      .select("id, booking_date, appointment_time, client_name, client_phone, pet_name, pet_type, dog_breed, service_notes, status, completed_at, payment_status, profiles!grooming_bookings_assigned_groomer_id_fkey(full_name)")
      .eq("store_id", store.id)
      .eq("booking_date", reportDate)
      .order("appointment_time", { ascending: true }),
    admin.from("kennel_inspections")
      .select("*")
      .eq("store_id", store.id)
      .eq("inspection_date", reportDate)
      .order("created_at", { ascending: false }),
    admin.from("shop_animal_inspections")
      .select("*")
      .eq("store_id", store.id)
      .eq("inspection_date", reportDate)
      .order("created_at", { ascending: false }),
    admin.from("grooming_inspections")
      .select("*")
      .eq("store_id", store.id)
      .eq("inspection_date", reportDate)
      .order("created_at", { ascending: false }),
    admin.from("kennel_inspections")
      .select("*")
      .eq("store_id", store.id)
      .eq("inspection_date", yesterday)
      .order("created_at", { ascending: false }),
    admin.from("shop_animal_inspections")
      .select("*")
      .eq("store_id", store.id)
      .eq("inspection_date", yesterday)
      .order("created_at", { ascending: false }),
    admin.from("grooming_inspections")
      .select("*")
      .eq("store_id", store.id)
      .eq("inspection_date", yesterday)
      .order("created_at", { ascending: false }),
  ]);

  if (liveBoardingError && !isMissingTable(liveBoardingError)) return NextResponse.json({ error: liveBoardingError.message }, { status: 500 });
  if (reportsError) return NextResponse.json({ error: reportsError.message }, { status: 500 });
  if (shopReportsError && !isMissingTable(shopReportsError)) return NextResponse.json({ error: shopReportsError.message }, { status: 500 });
  if (groomingBookingsError && !isMissingTable(groomingBookingsError)) return NextResponse.json({ error: groomingBookingsError.message }, { status: 500 });
  if (inspectionsError && !isMissingTable(inspectionsError)) return NextResponse.json({ error: inspectionsError.message }, { status: 500 });
  if (shopInspectionsError && !isMissingTable(shopInspectionsError)) return NextResponse.json({ error: shopInspectionsError.message }, { status: 500 });
  if (groomingInspectionsError && !isMissingTable(groomingInspectionsError)) return NextResponse.json({ error: groomingInspectionsError.message }, { status: 500 });
  if (previousError && !isMissingTable(previousError)) return NextResponse.json({ error: previousError.message }, { status: 500 });
  if (previousShopError && !isMissingTable(previousShopError)) return NextResponse.json({ error: previousShopError.message }, { status: 500 });
  if (previousGroomingError && !isMissingTable(previousGroomingError)) return NextResponse.json({ error: previousGroomingError.message }, { status: 500 });

  const latestByAnimal = new Map<string, any>();
  for (const item of inspections ?? []) {
    const key = `${item.kennel_report_id}:${item.row_id}`;
    if (!latestByAnimal.has(key)) latestByAnimal.set(key, item);
  }
  for (const item of shopInspections ?? []) {
    const key = `shop:${item.shop_animal_report_id}:${item.row_id}`;
    if (!latestByAnimal.has(key)) latestByAnimal.set(key, item);
  }
  for (const item of groomingInspections ?? []) {
    const key = `grooming:${item.grooming_booking_id}:${item.grooming_booking_id}`;
    if (!latestByAnimal.has(key)) latestByAnimal.set(key, {
      ...item,
      feeding_ok: item.booking_ok,
      cleaning_ok: item.client_updated_ok,
      walking_ok: null,
    });
  }

  const liveBoardingRows = liveBoardingError && isMissingTable(liveBoardingError) ? [] : (liveBoardingAnimals ?? []).map((animal: any, index: number) => {
    const row = animal.row_data ?? {};
    const key = `live-boarding:${animal.id}:${animal.id}`;
    return {
      key,
      source_type: "boarding",
      report_id: animal.id,
      row_id: animal.id,
      report_date: reportDate,
      category: animal.category,
      submitted_by_name: row.last_updated_by || animal.updated_by_name || animal.created_by_name || "Boarding sheet",
      submitted_at: row.last_updated_at || animal.updated_at || animal.created_at,
      label: row.label ?? `Boarding ${index + 1}`,
      pet_type: row.pet_type,
      animal_name: row.animal_name,
      received_by: row.received_by,
      breed: row.breed,
      client_number: row.client_number,
      cage_color: row.cage_color,
      cage_number: row.cage_number,
      check_in_date: row.check_in_date,
      checkout_date: row.checkout_date,
      payment_status: row.payment_status,
      boarding_days: row.boarding_days,
      paid_days: row.paid_days,
      overdue_days: row.overdue_days,
      extension_checkout_date: row.extension_checkout_date,
      extension_days: row.extension_days,
      extension_payment_status: row.extension_payment_status,
      invoice_numbers: row.invoice_numbers,
      extension_invoice_numbers: row.extension_invoice_numbers,
      misc_note: row.misc_note,
      brought_items: row.brought_items,
      last_updated_by: row.last_updated_by || animal.updated_by_name || animal.created_by_name,
      last_updated_at: row.last_updated_at || animal.updated_at || animal.created_at,
      health_status: row.health_status,
      report: row.report,
      feeding_done: Boolean(row.feeding_done),
      cleaning_done: Boolean(row.cleaning_done),
      walking_done: Boolean(row.walking_done),
      latest_inspection: latestByAnimal.get(key) ?? null,
    };
  });

  const reportBoardingRows = (reports ?? []).flatMap((report: any) =>
    (report.rows ?? []).map((row: any, index: number) => {
      const rowId = row.row_id ?? `${report.id}-${index}`;
      const key = `${report.id}:${rowId}`;
      return {
        key,
        source_type: "boarding",
        report_id: report.id,
        row_id: rowId,
        report_date: report.report_date,
        category: report.category,
        submitted_by_name: report.submitted_by_name,
        submitted_at: report.submitted_at,
        label: row.label ?? `Boarding ${index + 1}`,
        pet_type: row.pet_type,
        animal_name: row.animal_name,
        received_by: row.received_by,
        breed: row.breed,
        client_number: row.client_number,
        cage_color: row.cage_color,
        cage_number: row.cage_number,
        check_in_date: row.check_in_date,
        checkout_date: row.checkout_date,
        payment_status: row.payment_status,
        boarding_days: row.boarding_days,
        paid_days: row.paid_days,
        overdue_days: row.overdue_days,
        extension_checkout_date: row.extension_checkout_date,
        extension_days: row.extension_days,
        extension_payment_status: row.extension_payment_status,
        invoice_numbers: row.invoice_numbers,
        extension_invoice_numbers: row.extension_invoice_numbers,
        misc_note: row.misc_note,
        brought_items: row.brought_items,
        last_updated_by: row.last_updated_by,
        last_updated_at: row.last_updated_at,
        health_status: row.health_status,
        report: row.report,
        feeding_done: Boolean(row.feeding_done),
        cleaning_done: Boolean(row.cleaning_done),
        walking_done: Boolean(row.walking_done),
        latest_inspection: latestByAnimal.get(key) ?? null,
      };
    })
  );
  const boardingAnimals = liveBoardingRows.length > 0 ? liveBoardingRows : reportBoardingRows;
  const shopAnimals = shopReportsError && isMissingTable(shopReportsError) ? [] : (shopReports ?? []).flatMap((report: any) =>
    (report.rows ?? []).map((row: any, index: number) => {
      const rowId = row.row_id ?? `${report.id}-${index}`;
      const key = `shop:${report.id}:${rowId}`;
      return {
        key,
        source_type: "shop",
        report_id: report.id,
        row_id: rowId,
        report_date: report.report_date,
        category: row.shop_category ?? "shop_animals",
        submitted_by_name: report.submitted_by_name,
        submitted_at: report.submitted_at,
        label: row.label ?? `Shop Animal ${index + 1}`,
        pet_type: row.pet_type,
        animal_name: row.animal_name,
        client_number: "",
        breed: row.breed,
        cage_color: row.cage_color,
        cage_number: row.cage_number,
        display_area: row.display_area,
        quantity: row.quantity,
        checkout_date: "",
        payment_status: "",
        health_status: row.health_status,
        report: row.report,
        feeding_done: Boolean(row.feeding_done),
        cleaning_done: Boolean(row.cleaning_done),
        walking_done: false,
        latest_inspection: latestByAnimal.get(key) ?? null,
      };
    })
  );
  const groomingAnimals = groomingBookingsError && isMissingTable(groomingBookingsError) ? [] : (groomingBookings ?? []).map((booking: any, index: number) => {
    const key = `grooming:${booking.id}:${booking.id}`;
    return {
      key,
      source_type: "grooming",
      report_id: booking.id,
      row_id: booking.id,
      report_date: booking.booking_date,
      category: "grooming",
      submitted_by_name: booking.profiles?.full_name ?? "Grooming",
      submitted_at: `${booking.booking_date}T${booking.appointment_time ?? "00:00:00"}`,
      label: `Grooming ${index + 1}`,
      pet_type: booking.pet_type,
      animal_name: booking.pet_name,
      client_number: booking.client_phone,
      client_name: booking.client_name,
      breed: booking.dog_breed,
      cage_color: "",
      cage_number: "",
      display_area: "Grooming",
      quantity: 1,
      checkout_date: "",
      payment_status: booking.payment_status,
      health_status: booking.status,
      report: booking.service_notes,
      feeding_done: ["confirmed", "completed"].includes(booking.status),
      cleaning_done: Boolean(booking.completed_at || booking.status === "completed"),
      walking_done: false,
      groomer_name: booking.profiles?.full_name,
      appointment_time: booking.appointment_time,
      grooming_status: booking.status,
      latest_inspection: latestByAnimal.get(key) ?? null,
    };
  });
  const animals = [...boardingAnimals, ...groomingAnimals, ...shopAnimals];

  const previousRows = [
    ...(previous ?? []).map((row: any) => ({ ...row, source_type: "boarding" })),
    ...(previousShop ?? []).map((row: any) => ({ ...row, source_type: "shop" })),
    ...(previousGrooming ?? []).map((row: any) => ({ ...row, source_type: "grooming", animal_name: "Grooming booking" })),
  ];
  const issueRows = previousRows.filter((row: any) => row.status !== "ok" || row.action_needed || row.remarks);
  const yesterdaySummary = previousRows.length === 0
    ? "No inspection recorded yesterday."
    : issueRows.length === 0
      ? "Yesterday was ok."
      : `${issueRows.length} issue(s) from yesterday need attention.`;

  return NextResponse.json({ animals, yesterdaySummary, previousIssues: issueRows.slice(0, 12) });
}
