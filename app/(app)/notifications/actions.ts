"use server";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markRead(id: string) {
  const profile = await requireProfile();
  const supabase = createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("id", id).eq("recipient_id", profile.id).is("read_at", null);
  revalidatePath("/notifications");
  return { ok: true };
}

export async function markAllRead() {
  const profile = await requireProfile();
  const supabase = createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.id).is("read_at", null);
  revalidatePath("/notifications");
  return { ok: true };
}
