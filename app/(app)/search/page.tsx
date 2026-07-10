import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireRole(["super_admin", "manager"]);
  const q = (searchParams.q ?? "").trim();
  const supabase = createClient();

  let results: { type: string; title: string; subtitle: string; link: string; badge?: string }[] = [];

  if (q.length >= 2) {
    const like = `%${q}%`;
    const [emps, animals, incidents, memos, tasks] = await Promise.all([
      supabase.from("profiles").select("id, full_name, employee_code, role").or(`full_name.ilike.${like},employee_code.ilike.${like}`).limit(10),
      supabase.from("animals").select("id, name, species, tag_code, status").or(`name.ilike.${like},species.ilike.${like},tag_code.ilike.${like}`).limit(10),
      supabase.from("incident_reports").select("id, category, description, status").or(`description.ilike.${like},category.ilike.${like}`).limit(10),
      supabase.from("memos").select("id, reason, status").ilike("reason", like).limit(10),
      supabase.from("checklist_tasks").select("id, title, status, instance_id").ilike("title", like).limit(10),
    ]);
    results = [
      ...(emps.data ?? []).map((e: any) => ({ type: "Employee", title: e.full_name, subtitle: e.employee_code, link: "/admin/employees", badge: e.role })),
      ...(animals.data ?? []).map((a: any) => ({ type: "Animal", title: a.name || a.species, subtitle: a.tag_code, link: `/animals/${a.id}`, badge: a.status })),
      ...(incidents.data ?? []).map((i: any) => ({ type: "Incident", title: i.category.replace(/_/g, " "), subtitle: i.description?.slice(0, 80), link: `/incidents/${i.id}`, badge: i.status })),
      ...(memos.data ?? []).map((m: any) => ({ type: "Memo", title: m.reason, subtitle: "", link: `/memos/${m.id}`, badge: m.status })),
      ...(tasks.data ?? []).map((t: any) => ({ type: "Task", title: t.title, subtitle: "", link: "/verify", badge: t.status })),
    ];
  }

  return (
    <div>
      <PageHeader title="Global Search" />
      <form className="mb-6 flex max-w-lg gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Search employees, animals, incidents, memos, tasks…" autoFocus />
        <button className="btn-primary">Search</button>
      </form>
      {q && results.length === 0 && <EmptyState message={`No results for “${q}”.`} />}
      {results.length > 0 && (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {results.map((r, i) => (
            <Link key={i} href={r.link} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-slate-500">{r.type}{r.subtitle ? ` · ${r.subtitle}` : ""}</p>
              </div>
              {r.badge && <Badge value={r.badge} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
