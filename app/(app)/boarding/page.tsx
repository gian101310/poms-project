import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/tz";
import { PawPrint } from "lucide-react";
import { NewStayButton, StayActions } from "./boarding-forms";

export const dynamic = "force-dynamic";

const payCls: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default async function BoardingPage() {
  await requireProfile();
  const supabase = createClient();
  const { data: stays } = await supabase
    .from("boarding_stays")
    .select("*, boarding_pets(*), profiles!boarding_stays_created_by_fkey(full_name)")
    .order("status", { ascending: true })
    .order("check_out_date", { ascending: true });

  const active = (stays ?? []).filter((s: any) => s.status === "active");
  const past = (stays ?? []).filter((s: any) => s.status !== "active");

  const Card = ({ s }: { s: any }) => {
    const items = [
      s.brought_cage && "Cage", s.brought_food && "Food", s.brought_toys && "Toys",
      s.brought_bags && "Bags", s.brought_other,
    ].filter(Boolean);
    return (
      <div className={`card p-4 ${s.status !== "active" ? "opacity-70" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{s.owner_name} <span className="text-sm font-normal text-slate-400">· {s.owner_contact}</span></p>
            <p className="text-xs text-slate-500">
              {fmtDate(s.check_in_date)} → {fmtDate(s.check_out_date)} · {(s.boarding_pets ?? []).length} pet(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${payCls[s.payment_status] ?? payCls.unpaid}`}>
              {s.payment_status}{s.amount ? ` · AED ${s.amount}` : ""}
            </span>
            {s.status !== "active" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-500 dark:bg-slate-800">{s.status.replace("_", " ")}</span>}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {(s.boarding_pets ?? []).map((p: any) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700">
              <PawPrint size={12} className="text-brand-600" />
              {p.pet_name ? `${p.pet_name} · ` : ""}{p.pet_type}{p.pet_breed ? ` (${p.pet_breed})` : ""}{p.pet_color ? ` · ${p.pet_color}` : ""}
            </span>
          ))}
        </div>

        {items.length > 0 && <p className="mt-2 text-xs text-slate-500">Brought: {items.join(", ")}</p>}
        {s.notes && <p className="mt-1 text-xs text-slate-500">Notes: {s.notes}</p>}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Logged by {s.profiles?.full_name ?? "—"}</span>
          <StayActions stay={s} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Boarding & Kennel" subtitle="Record pets checked in for boarding." action={<NewStayButton />} />
      {(stays ?? []).length === 0 && <EmptyState message="No boardings yet. Tap “New Boarding” to add one." />}

      {active.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Currently boarding ({active.length})</h2>
          <div className="space-y-3">{active.map((s: any) => <Card key={s.id} s={s} />)}</div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Past / closed</h2>
          <div className="space-y-3">{past.map((s: any) => <Card key={s.id} s={s} />)}</div>
        </section>
      )}
    </div>
  );
}
