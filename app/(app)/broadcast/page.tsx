import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { BroadcastForm } from "./broadcast-form";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  await requireRole(["manager", "super_admin"]);
  const supabase = createClient();
  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, employee_code")
    .eq("status", "active")
    .neq("role", "super_admin")
    .neq("employee_code", "BOSSG")
    .order("full_name");

  return (
    <div>
      <PageHeader title="Send Alert" subtitle="Push an urgent message to everyone or one person." />
      <BroadcastForm staff={staff ?? []} />
    </div>
  );
}
