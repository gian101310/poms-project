import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { TaskEditor, TemplateActions } from "../template-forms";

export const dynamic = "force-dynamic";

export default async function TemplateDetail({ params }: { params: { id: string } }) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const { data: template } = await supabase.from("checklist_templates")
    .select("*, departments(name), shifts(name), template_tasks(*)")
    .eq("id", params.id).single();

  if (!template) return <EmptyState message="Template not found." />;
  const tasks = (template.template_tasks ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);

  return (
    <div>
      <PageHeader title={template.name}
        subtitle={`${template.departments?.name} · ${template.shifts?.name} · v${template.version} · ${tasks.length} tasks`}
        action={<div className="flex flex-wrap items-center gap-2"><Badge value={template.is_active ? "active" : "closed"} /><TemplateActions template={template} /></div>} />
      <TaskEditor templateId={template.id} tasks={tasks} />
    </div>
  );
}
