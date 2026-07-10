"use server";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAnimal(fd: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { error } = await supabase.from("animals").insert({
    store_id: profile.store_id,
    department_id: String(fd.get("department_id")),
    tag_code: String(fd.get("tag_code")).trim().toUpperCase(),
    species: String(fd.get("species")).trim(),
    breed: (fd.get("breed") as string) || null,
    name: (fd.get("name") as string) || null,
    enclosure: (fd.get("enclosure") as string) || null,
    intake_date: (fd.get("intake_date") as string) || null,
    notes: (fd.get("notes") as string) || null,
  });
  revalidatePath("/animals");
  return error ? { error: error.message } : { ok: true };
}

export async function addWelfareRecord(animalId: string, fd: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();
  const details: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("d_") && v) details[k.slice(2)] = String(v);
  }
  const recordType = String(fd.get("record_type"));
  const { error } = await supabase.from("welfare_records").insert({
    animal_id: animalId,
    record_type: recordType,
    remarks: String(fd.get("remarks")),
    details,
    recorded_by: profile.id,
  });
  // Mortality auto-updates the animal status
  if (!error && recordType === "mortality") {
    await supabase.from("animals").update({ status: "deceased" }).eq("id", animalId);
  }
  if (!error && recordType === "isolation") {
    await supabase.from("animals").update({ status: "isolated" }).eq("id", animalId);
  }
  revalidatePath(`/animals/${animalId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function setAnimalStatus(animalId: string, status: string) {
  await requireProfile();
  const supabase = createClient();
  const { error } = await supabase.from("animals").update({ status }).eq("id", animalId);
  revalidatePath(`/animals/${animalId}`);
  return error ? { error: error.message } : { ok: true };
}
