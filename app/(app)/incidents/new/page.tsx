import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { IncidentForm } from "../incident-form";

export default async function NewIncidentPage() {
  await requireProfile();
  const supabase = createClient();
  const { data: departments } = await supabase.from("departments")
    .select("id, name").eq("is_active", true).order("name");
  return (
    <div>
      <PageHeader title="New Incident Report" />
      <IncidentForm departments={departments ?? []} />
    </div>
  );
}
