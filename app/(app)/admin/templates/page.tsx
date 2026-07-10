import Link from "next/link";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table } from "@/components/ui";
import { TemplateForm } from "./template-forms";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const [{ data: templates }, { data: departments }, { data: shifts }] = await Promise.all([
    supabase.from("checklist_templates")
      .select("*, departments(name), shifts(name), template_tasks(id)")
      .order("created_at", { ascending: false }),
    supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
    supabase.from("shifts").select("id, name").eq("is_active", true).order("start_time"),
  ]);

  return (
    <div>
      <PageHeader title="Checklist Templates"
        subtitle="One active template per department + shift. Editing creates a new version."
        action={<TemplateForm departments={departments ?? []} shifts={shifts ?? []} />} />
      {(!templates || templates.length === 0) ? (
        <EmptyState message="No templates yet. Create one per department + shift — daily checklists are generated from these." />
      ) : (
        <Table headers={["Template", "Department", "Shift", "Tasks", "Version", "Status", ""]}>
          {templates.map((t: any) => (
            <tr key={t.id} className="table-row">
              <td className="td font-medium">{t.name}</td>
              <td className="td">{t.departments?.name}</td>
              <td className="td">{t.shifts?.name}</td>
              <td className="td">{(t.template_tasks ?? []).length}</td>
              <td className="td">v{t.version}</td>
              <td className="td"><Badge value={t.is_active ? "active" : "closed"} /></td>
              <td className="td">
                <Link href={`/admin/templates/${t.id}`} className="text-sm font-medium text-brand-600 hover:underline">Edit tasks →</Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
