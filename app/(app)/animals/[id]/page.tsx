import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { fmtDateTime, fmtDate } from "@/lib/tz";
import { WelfareForm, StatusSelect } from "../forms";

export const dynamic = "force-dynamic";

export default async function AnimalDetail({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();

  const [{ data: animal }, { data: records }] = await Promise.all([
    supabase.from("animals").select("*, departments(name)").eq("id", params.id).single(),
    supabase.from("welfare_records")
      .select("*, profiles(full_name, employee_code)")
      .eq("animal_id", params.id).order("recorded_at", { ascending: false }).limit(100),
  ]);

  if (!animal) return <EmptyState message="Animal not found." />;

  return (
    <div>
      <PageHeader
        title={`${animal.name || animal.species} (${animal.tag_code})`}
        subtitle={`${animal.species}${animal.breed ? " · " + animal.breed : ""} · ${animal.departments?.name} · Enclosure ${animal.enclosure || "—"} · Intake ${fmtDate(animal.intake_date)}`}
        action={<div className="flex items-center gap-2"><StatusSelect animalId={animal.id} current={animal.status} /><WelfareForm animalId={animal.id} /></div>}
      />
      <div className="mb-4"><Badge value={animal.status} /></div>

      <h2 className="mb-3 text-lg font-semibold">Welfare History</h2>
      {(!records || records.length === 0) ? (
        <EmptyState message="No welfare records yet. Add the first observation." />
      ) : (
        <div className="space-y-2">
          {records.map((r: any) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge value={r.record_type} />
                <p className="text-xs text-slate-500">
                  {fmtDateTime(r.recorded_at)} · {r.profiles?.full_name} ({r.profiles?.employee_code})
                </p>
              </div>
              {r.remarks && <p className="mt-2 text-sm">{r.remarks}</p>}
              {r.details && Object.keys(r.details).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(r.details).map(([k, v]) => (
                    <span key={k} className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                      <span className="font-semibold">{k}:</span> {String(v)}
                    </span>
                  ))}
                </div>
              )}
              {(r.photos ?? []).length > 0 && <p className="mt-1 text-xs text-slate-400">{r.photos.length} photo(s)</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
