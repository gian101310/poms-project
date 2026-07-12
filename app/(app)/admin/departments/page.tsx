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
    .select("*, stores(id, name, code), sections(*), department_assignments(profile_id, is_primary_supervisor, profiles(full_name))")
    .eq("is_active", true)
    .order("name");
  const { data: stores } = await supabase.from("stores")
    .select("id, name, code")
    .eq("is_active", true)
    .order("created_at");

  const byStore = new Map<string, { store: any; departments: any[] }>();
  for (const store of stores ?? []) byStore.set(store.id, { store, departments: [] });
  for (const dept of departments ?? []) {
    const storeId = dept.store_id;
    const entry = byStore.get(storeId) ?? {
      store: dept.stores ?? { id: storeId, name: "Unknown branch", code: "" },
      departments: [],
    };
    entry.departments.push(dept);
    byStore.set(storeId, entry);
  }

  return (
    <div>
      <PageHeader
        title="Departments & Sections"
        subtitle="Departments are grouped by branch so branch copies do not look like duplicates."
        action={<DeptForm stores={stores ?? []} />}
      />

      <div className="space-y-6">
        {Array.from(byStore.values()).map(({ store, departments: storeDepartments }) => (
          <section key={store.id} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold">{store.name}</h2>
                <p className="font-mono text-xs text-slate-400">{store.code}</p>
              </div>
              <Badge value={`${storeDepartments.length} departments`} />
            </div>
            {storeDepartments.map((d: any) => {
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
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">{d.stores?.name}</span>
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
          </section>
        ))}
      </div>
    </div>
  );
}
