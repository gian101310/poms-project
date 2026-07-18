import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const categories = new Set(["dogs", "cats", "birds", "reptiles", "small_animals"]);
const paymentStatuses = new Set(["fully paid", "partially paid", "unpaid", "paid"]);

function isMissingTable(error: any) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function cleanString(value: any) {
  return String(value ?? "").trim();
}

function cleanRow(row: any) {
  const paymentStatus = cleanString(row.payment_status ?? row.paymentStatus).toLowerCase();
  const paidDaysMode = cleanString(row.paid_days_mode ?? row.paidDaysMode).toLowerCase();
  const extensionPaymentStatus = cleanString(row.extension_payment_status ?? row.extensionPaymentStatus).toLowerCase();
  return {
    row_id: cleanString(row.row_id ?? row.id),
    pet_type: cleanString(row.pet_type ?? row.petType),
    animal_name: cleanString(row.animal_name ?? row.animalName),
    received_by: cleanString(row.received_by ?? row.receivedBy),
    breed: cleanString(row.breed),
    size: cleanString(row.size),
    cage_color: cleanString(row.cage_color ?? row.cageColor),
    cage_number: cleanString(row.cage_number ?? row.cageNumber),
    client_number: cleanString(row.client_number ?? row.clientNumber),
    check_in_date: cleanString(row.check_in_date ?? row.checkInDate),
    checkout_date: cleanString(row.checkout_date ?? row.checkoutDate),
    payment_status: paymentStatuses.has(paymentStatus) ? paymentStatus : "unpaid",
    boarding_days: Number.isFinite(Number(row.boarding_days)) ? Number(row.boarding_days) : 0,
    paid_days_mode: ["full", "half", "custom"].includes(paidDaysMode) ? paidDaysMode : "full",
    paid_days: Number.isFinite(Number(row.paid_days)) ? Number(row.paid_days) : 0,
    extension_checkout_date: cleanString(row.extension_checkout_date ?? row.extensionCheckoutDate),
    extension_days: Number.isFinite(Number(row.extension_days)) ? Number(row.extension_days) : 0,
    extension_payment_status: paymentStatuses.has(extensionPaymentStatus) ? extensionPaymentStatus : "unpaid",
    invoice_numbers: cleanString(row.invoice_numbers ?? row.invoiceNumbers),
    extension_invoice_numbers: cleanString(row.extension_invoice_numbers ?? row.extensionInvoiceNumbers),
    overdue_days: Number.isFinite(Number(row.overdue_days)) ? Number(row.overdue_days) : 0,
    misc_note: cleanString(row.misc_note ?? row.miscNote),
    brought_items: typeof row.brought_items === "object" && row.brought_items !== null ? row.brought_items : {},
    health_status: cleanString(row.health_status ?? row.healthStatus),
    report: cleanString(row.report),
    feeding_done: Boolean(row.feeding_done ?? row.feedingDone),
    cleaning_done: Boolean(row.cleaning_done ?? row.cleaningDone),
    walking_done: Boolean(row.walking_done ?? row.walkingDone),
    last_updated_by: cleanString(row.last_updated_by ?? row.lastUpdatedBy),
    last_updated_at: cleanString(row.last_updated_at ?? row.lastUpdatedAt),
  };
}

async function getSpringsStoreAndStaff(admin: ReturnType<typeof createAdminClient>, profileId: string) {
  const { data: store, error: storeError } = await admin.from("stores")
    .select("id")
    .eq("code", "SPRINGS")
    .single();
  if (storeError || !store) return { error: "Springs branch not found.", status: 500 as const };

  const { data: staff, error: staffError } = await admin.from("profiles")
    .select("id, full_name, employee_code")
    .eq("id", profileId)
    .eq("store_id", store.id)
    .eq("status", "active")
    .single();
  if (staffError || !staff) return { error: "Choose a valid Springs staff member.", status: 400 as const };

  return { store, staff, actorName: `${staff.full_name} (${staff.employee_code})` };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = cleanString(url.searchParams.get("category"));
  if (!categories.has(category)) return NextResponse.json({ error: "Choose a valid boarding page." }, { status: 400 });

  const admin = createAdminClient();
  const { data: store, error: storeError } = await admin.from("stores")
    .select("id")
    .eq("code", "SPRINGS")
    .single();
  if (storeError || !store) return NextResponse.json({ error: "Springs branch not found." }, { status: 500 });

  const { data, error } = await admin.from("public_boarding_animals")
    .select("id, category, row_data, created_by_name, updated_by_name, created_at, updated_at")
    .eq("store_id", store.id)
    .eq("category", category)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ animals: [], needsMigration: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    animals: (data ?? []).map((item: any) => ({
      id: item.id,
      ...item.row_data,
      last_updated_by: item.row_data?.last_updated_by || item.updated_by_name || item.created_by_name || "",
      last_updated_at: item.row_data?.last_updated_at || item.updated_at || item.created_at || "",
    })),
  });
}

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const category = cleanString(body.category);
  const submittedByProfileId = cleanString(body.submitted_by_profile_id);
  if (!categories.has(category)) return NextResponse.json({ error: "Choose a valid boarding page." }, { status: 400 });
  if (!submittedByProfileId) return NextResponse.json({ error: "Choose staff name before adding boarding." }, { status: 400 });

  const admin = createAdminClient();
  const lookup = await getSpringsStoreAndStaff(admin, submittedByProfileId);
  if ("error" in lookup) return NextResponse.json({ error: lookup.error }, { status: lookup.status });

  const now = new Date().toISOString();
  const rowData = {
    ...cleanRow(body.row ?? {}),
    last_updated_by: lookup.actorName,
    last_updated_at: now,
  };

  const { data, error } = await admin.from("public_boarding_animals")
    .insert({
      store_id: lookup.store.id,
      category,
      row_data: rowData,
      created_by_profile_id: lookup.staff.id,
      created_by_name: lookup.actorName,
      updated_by_profile_id: lookup.staff.id,
      updated_by_name: lookup.actorName,
    })
    .select("id, row_data, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: isMissingTable(error) ? 409 : 500 });

  await admin.from("public_boarding_animal_logs").insert({
    animal_id: data.id,
    store_id: lookup.store.id,
    action: "add",
    actor_profile_id: lookup.staff.id,
    actor_name: lookup.actorName,
    after_data: rowData,
  });

  return NextResponse.json({ ok: true, animal: { id: data.id, ...data.row_data } });
}

export async function PATCH(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const submittedByProfileId = cleanString(body.submitted_by_profile_id);
  if (!submittedByProfileId) return NextResponse.json({ error: "Choose staff name before updating." }, { status: 400 });

  const admin = createAdminClient();
  const lookup = await getSpringsStoreAndStaff(admin, submittedByProfileId);
  if ("error" in lookup) return NextResponse.json({ error: lookup.error }, { status: lookup.status });

  if (body.action === "all_done") {
    const category = cleanString(body.category);
    if (!categories.has(category)) return NextResponse.json({ error: "Choose a valid boarding page." }, { status: 400 });

    const { data: animals, error: readError } = await admin.from("public_boarding_animals")
      .select("id, row_data")
      .eq("store_id", lookup.store.id)
      .eq("category", category)
      .eq("status", "active");
    if (readError) return NextResponse.json({ error: readError.message }, { status: isMissingTable(readError) ? 409 : 500 });

    const now = new Date().toISOString();
    await Promise.all((animals ?? []).map(async (animal: any) => {
      const afterData = {
        ...animal.row_data,
        feeding_done: true,
        cleaning_done: true,
        walking_done: category === "dogs" ? true : Boolean(animal.row_data?.walking_done),
        last_updated_by: lookup.actorName,
        last_updated_at: now,
      };
      await admin.from("public_boarding_animals").update({
        row_data: afterData,
        updated_by_profile_id: lookup.staff.id,
        updated_by_name: lookup.actorName,
        updated_at: now,
      }).eq("id", animal.id);
      await admin.from("public_boarding_animal_logs").insert({
        animal_id: animal.id,
        store_id: lookup.store.id,
        action: "all_done",
        actor_profile_id: lookup.staff.id,
        actor_name: lookup.actorName,
        before_data: animal.row_data,
        after_data: afterData,
      });
    }));

    return NextResponse.json({ ok: true, updated: animals?.length ?? 0 });
  }

  const animalId = cleanString(body.id);
  if (!animalId) return NextResponse.json({ error: "Missing boarding animal." }, { status: 400 });

  const { data: existing, error: existingError } = await admin.from("public_boarding_animals")
    .select("id, row_data")
    .eq("id", animalId)
    .eq("store_id", lookup.store.id)
    .eq("status", "active")
    .single();
  if (existingError || !existing) return NextResponse.json({ error: existingError?.message ?? "Boarding animal not found." }, { status: isMissingTable(existingError) ? 409 : 404 });

  const now = new Date().toISOString();
  const afterData = {
    ...cleanRow(body.row ?? {}),
    last_updated_by: lookup.actorName,
    last_updated_at: now,
  };

  const { error } = await admin.from("public_boarding_animals")
    .update({
      row_data: afterData,
      updated_by_profile_id: lookup.staff.id,
      updated_by_name: lookup.actorName,
      updated_at: now,
    })
    .eq("id", animalId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("public_boarding_animal_logs").insert({
    animal_id: animalId,
    store_id: lookup.store.id,
    action: "update",
    actor_profile_id: lookup.staff.id,
    actor_name: lookup.actorName,
    before_data: existing.row_data,
    after_data: afterData,
  });

  return NextResponse.json({ ok: true, animal: { id: animalId, ...afterData } });
}

export async function DELETE(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const animalId = cleanString(body.id);
  const submittedByProfileId = cleanString(body.submitted_by_profile_id);
  if (!animalId) return NextResponse.json({ error: "Missing boarding animal." }, { status: 400 });
  if (!submittedByProfileId) return NextResponse.json({ error: "Choose staff name before deleting." }, { status: 400 });

  const admin = createAdminClient();
  const lookup = await getSpringsStoreAndStaff(admin, submittedByProfileId);
  if ("error" in lookup) return NextResponse.json({ error: lookup.error }, { status: lookup.status });

  const { data: existing, error: existingError } = await admin.from("public_boarding_animals")
    .select("id, row_data")
    .eq("id", animalId)
    .eq("store_id", lookup.store.id)
    .eq("status", "active")
    .single();
  if (existingError || !existing) return NextResponse.json({ error: existingError?.message ?? "Boarding animal not found." }, { status: isMissingTable(existingError) ? 409 : 404 });

  const now = new Date().toISOString();
  const { error } = await admin.from("public_boarding_animals").update({
    status: "deleted",
    deleted_by_profile_id: lookup.staff.id,
    deleted_by_name: lookup.actorName,
    deleted_at: now,
    updated_by_profile_id: lookup.staff.id,
    updated_by_name: lookup.actorName,
    updated_at: now,
  }).eq("id", animalId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("public_boarding_animal_logs").insert({
    animal_id: animalId,
    store_id: lookup.store.id,
    action: "delete",
    actor_profile_id: lookup.staff.id,
    actor_name: lookup.actorName,
    before_data: existing.row_data,
  });

  return NextResponse.json({ ok: true });
}
