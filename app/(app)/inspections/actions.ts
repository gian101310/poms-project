"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createInspection(input: {
  inspection_type: string;
  department_id: string;
  remarks: string;
  items: { criterion: string; max_score: number; score: number; remark: string }[];
  signature: string | null;
}) {
  const profile = await requireRole(["super_admin", "manager", "supervisor"]);
  const supabase = createClient();

  const { data: insp, error } = await supabase.from("inspections").insert({
    inspection_type: input.inspection_type,
    department_id: input.department_id,
    inspector_id: profile.id,
    remarks: input.remarks || null,
    status: "draft",
  }).select("id").single();
  if (error || !insp) return { error: error?.message ?? "Failed to create inspection" };

  const { error: itemsErr } = await supabase.from("inspection_items").insert(
    input.items.map((it, i) => ({
      inspection_id: insp.id,
      criterion: it.criterion,
      max_score: it.max_score,
      score: it.score,
      remark: it.remark || null,
      sort_order: i,
    }))
  );
  if (itemsErr) return { error: itemsErr.message };

  // Upload signature (service role → signatures bucket) then finalize
  let signature_path: string | null = null;
  if (input.signature) {
    try {
      const admin = createAdminClient();
      const base64 = input.signature.split(",")[1];
      const bytes = Buffer.from(base64, "base64");
      signature_path = `${insp.id}.png`;
      await admin.storage.from("signatures").upload(signature_path, bytes, { contentType: "image/png", upsert: true });
    } catch { signature_path = null; }
  }

  const { error: finalErr } = await supabase.from("inspections")
    .update({ status: "submitted", signature_path }).eq("id", insp.id);
  revalidatePath("/inspections");
  return finalErr ? { error: finalErr.message } : { ok: true };
}
