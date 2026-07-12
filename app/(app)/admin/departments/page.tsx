import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge } from "@/components/ui";
import {
  DeptForm, DeptToggle, EditDept,
  SectionForm, EditSection, SectionToggle, DeleteSection,
} from "./dept-forms";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const { data: departments } = await supabase.from("departments")
    .select("*, sections(*), department_assignments(profile_id, is_primary_supervisor, profiles(full_name))")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Departments & Sections"
        subtitle="Add, rename, activate, or remove departments and the sections inside them."
        action={<DeptForm />}
      />

      <div className="space-y-4">
        {(departments ?? []).map((d: any) => {
          const sups = (d.department_assignments ?? []).filter((a: any) => a.is_primary_supervisor);
          const sections = (d.sections ?? []).sort(
            (a: any, b: any) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name)
          );
          return (
            <div key={d.id} className={`card p-4 ${d.is_active ? "" : "opacity-60"}`}>
              {/* Department header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{d.name}</span>
                  <span className="font-mono text-xs text-slate-400">{d.code}</span>
                  <Badge value={d.is_active ? "active" : "suspended"} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-2 text-xs text-slate-400">
                    {sups.map((s: any) => s.profiles?.full_name).join(", ") || "no supervisor"} ·{" "}
                    {(d.department_assignments ?? []).length} staff
                  </span>
                  <SectionForm departmentId={d.id} deptName={d.name} />
                  <EditDept dept={d} />
                  <DeptToggle id={d.id} isActive={d.is_active} />
                </div>
              </div>

              {/* Sections */}
              {sections.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {sections.map((s: any) => (
                    <div key={s.id}
                      className={`flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700 ${s.is_active ? "" : "opacity-50 line-through"}`}>
                      <span className="text-xs">{s.name}</span>
                      <EditSection section={s} />
                      <SectionToggle id={s.id} isActive={s.is_active} />
                      <DeleteSection id={s.id} name={s.name} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">No sections yet — use “Add section”.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
