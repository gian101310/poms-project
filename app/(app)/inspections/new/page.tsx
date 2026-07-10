import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { InspectionForm } from "../inspection-form";

export default async function NewInspectionPage() {
  await requireRole(["super_admin", "manager", "supervisor"]);
  const supabase = createClient();
  const { data: departments } = await supabase.from("departments")
    .select("id, name, code").eq("is_active", true).order("name");
  return (
    <div>
      <PageHeader title="New Inspection" />
      <InspectionForm departments={departments ?? []} />
    </div>
  );
}
