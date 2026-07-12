import { createAdminClient } from "@/lib/supabase/admin";

export async function getPortalName() {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("app_settings")
      .select("value")
      .eq("key", "portal_name")
      .order("store_id", { ascending: true, nullsFirst: true })
      .limit(1)
      .maybeSingle();
    return typeof data?.value === "string" && data.value.trim() ? data.value.trim() : "POMS";
  } catch {
    return "POMS";
  }
}
