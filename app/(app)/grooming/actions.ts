"use server";
import { revalidatePath } from "next/cache";
import { requireProfile, isManagerUp } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayStr } from "@/lib/tz";

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function createGroomingBooking(fd: FormData) {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const assigned = isManagerUp(profile.role)
    ? String(fd.get("assigned_groomer_id") || profile.id)
    : profile.id;
  const bookingDate = String(fd.get("booking_date") || todayStr());

  const { data: groomer, error: groomerError } = await admin.from("profiles")
    .select("id, store_id, status")
    .eq("id", assigned)
    .single();
  if (groomerError || !groomer || groomer.status !== "active") {
    return { error: "Groomer account is not active." };
  }

  const { error } = await admin.from("grooming_bookings").insert({
    store_id: groomer.store_id,
    assigned_groomer_id: assigned,
    booking_date: bookingDate,
    appointment_time: optionalText(fd.get("appointment_time")),
    client_name: String(fd.get("client_name") ?? "").trim(),
    client_phone: String(fd.get("client_phone") ?? "").trim(),
    pet_name: optionalText(fd.get("pet_name")),
    pet_type: String(fd.get("pet_type") || "Dog"),
    dog_breed: optionalText(fd.get("dog_breed")),
    service_notes: optionalText(fd.get("service_notes")),
    payment_status: fd.get("payment_status") === "paid" ? "paid" : "unpaid",
    created_by: profile.id,
    updated_by: profile.id,
  });
  revalidatePath("/grooming");
  revalidatePath("/dashboard");
  revalidatePath("/overview");
  return error ? { error: error.message } : { ok: true };
}

export async function updateGroomingStatus(id: string, action: "confirm" | "complete" | "finish_called" | "cannot_call" | "paid" | "unpaid", reason?: string) {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const patch: Record<string, any> = { updated_by: profile.id, updated_at: now };

  if (action === "confirm") {
    patch.status = "confirmed";
    patch.confirmed_at = now;
  } else if (action === "complete") {
    patch.status = "completed";
    patch.completed_at = now;
  } else if (action === "finish_called") {
    patch.finish_called_at = now;
    patch.cannot_call_reason = null;
  } else if (action === "cannot_call") {
    patch.cannot_call_reason = reason?.trim() || "Client could not be reached.";
  } else if (action === "paid" || action === "unpaid") {
    patch.payment_status = action;
  }

  const query = admin.from("grooming_bookings").update(patch).eq("id", id);
  if (!isManagerUp(profile.role)) query.eq("assigned_groomer_id", profile.id);
  const { error } = await query;
  revalidatePath("/grooming");
  revalidatePath("/dashboard");
  revalidatePath("/overview");
  return error ? { error: error.message } : { ok: true };
}
