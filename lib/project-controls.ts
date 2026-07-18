import { createAdminClient } from "@/lib/supabase/admin";

export async function getProjectControlSettings() {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("app_settings")
      .select("key, value")
      .in("key", ["project_enabled", "task_scheduling_enabled"]);
    const map = new Map((data ?? []).map((item: any) => [item.key, item.value]));
    return {
      projectEnabled: map.get("project_enabled") !== false,
      taskSchedulingEnabled: map.get("task_scheduling_enabled") === true,
    };
  } catch {
    return { projectEnabled: true, taskSchedulingEnabled: false };
  }
}
