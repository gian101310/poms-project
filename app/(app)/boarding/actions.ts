"use server";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type PetInput = { pet_type: string; pet_breed?: string; pet_color?: string; pet_name?: string; description?: string; feeding_notes?: string; meds_notes?: string };

export async function createStay(payload: any) {
  const profile = await requireProfile();
  const supabase = createClient();

  const pets: PetInput[] = (payload.pets ?? []).filter((p: PetInput) => p.pet_type);
  if (!payload.owner_name || !payload.owner_contact) return { error: "Owner name and contact are required." };
  if (!payload.check_in_date || !payload.check_out_date) return { error: "Check-in and check-out dates are required." };
  if (pets.length === 0) return { error: "Add at least one pet." };

  const { data: stay, error } = await supabase.from("boarding_stays").insert({
    store_id: profile.store_id,
    owner_name: payload.owner_name,
    owner_contact: payload.owner_contact,
    owner_email: payload.owner_email || null,
    check_in_date: payload.check_in_date,
    check_out_date: payload.check_out_date,
    payment_status: payload.payment_status || "unpaid",
    amount: payload.amount ? Number(payload.amount) : null,
    amount_paid: payload.amount_paid ? Number(payload.amount_paid) : null,
    brought_cage: !!payload.brought_cage,
    brought_food: !!payload.brought_food,
    brought_toys: !!payload.brought_toys,
    brought_bags: !!payload.brought_bags,
    brought_other: payload.brought_other || null,
    notes: payload.notes || null,
    created_by: profile.id,
  }).select("id").single();

  if (error || !stay) return { error: error?.message ?? "Could not save boarding." };

  const rows = pets.map((p) => ({
    stay_id: stay.id,
    pet_type: p.pet_type,
    pet_breed: p.pet_breed || null,
    pet_color: p.pet_color || null,
    pet_name: p.pet_name || null,
    description: p.description || null,
    feeding_notes: p.feeding_notes || null,
    meds_notes: p.meds_notes || null,
  }));
  const { error: pe } = await supabase.from("boarding_pets").insert(rows);
  if (pe) return { error: pe.message };

  revalidatePath("/boarding");
  return { ok: true };
}

export async function setStayStatus(id: string, status: "active" | "checked_out" | "cancelled") {
  await requireProfile();
  const supabase = createClient();
  const { error } = await supabase.from("boarding_stays")
    .update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/boarding");
  return error ? { error: error.message } : { ok: true };
}

export async function setPayment(id: string, payment_status: string, amount_paid?: number) {
  await requireProfile();
  const supabase = createClient();
  const patch: any = { payment_status, updated_at: new Date().toISOString() };
  if (amount_paid !== undefined) patch.amount_paid = amount_paid;
  const { error } = await supabase.from("boarding_stays").update(patch).eq("id", id);
  revalidatePath("/boarding");
  return error ? { error: error.message } : { ok: true };
}
