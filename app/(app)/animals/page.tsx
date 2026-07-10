import { requireProfile, isSupervisorUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table } from "@/components/ui";
import Link from "next/link";
import { AnimalForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function AnimalsPage() {
  const profile = await requireProfile();
  const supabase = createClient();

  const [{ data: animals }, { data: departments }] = await Promise.all([
    supabase.from("animals").select("*, departments(name)").order("created_at", { ascending: false }),
    supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Animal Welfare" subtitle="Registry and welfare records"
        action={<AnimalForm departments={departments ?? []} canAdd />} />
      {(!animals || animals.length === 0) ? (
        <EmptyState message="No animals registered yet." />
      ) : (
        <Table headers={["Tag", "Name / Species", "Department", "Enclosure", "Status", ""]}>
          {animals.map((a: any) => (
            <tr key={a.id} className="table-row">
              <td className="td font-mono text-xs">{a.tag_code}</td>
              <td className="td">
                <p className="font-medium">{a.name || a.species}</p>
                <p className="text-xs text-slate-500">{a.species}{a.breed ? ` · ${a.breed}` : ""}</p>
              </td>
              <td className="td">{a.departments?.name}</td>
              <td className="td">{a.enclosure || "—"}</td>
              <td className="td"><Badge value={a.status} /></td>
              <td className="td">
                <Link href={`/animals/${a.id}`} className="text-sm font-medium text-brand-600 hover:underline">Records →</Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
