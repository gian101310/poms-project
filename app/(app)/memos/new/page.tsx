import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { MemoForm } from "../memo-form";

export default async function NewMemoPage() {
  await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const { data: employees } = await supabase.from("profiles")
    .select("id, full_name, employee_code").eq("status", "active").neq("role", "super_admin").neq("employee_code", "BOSSG").order("full_name");
  return (
    <div>
      <PageHeader title="Issue Memo" />
      <MemoForm employees={employees ?? []} />
    </div>
  );
}
