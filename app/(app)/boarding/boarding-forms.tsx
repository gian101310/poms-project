"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStay, setStayStatus, setPayment } from "./actions";
import { PET_TYPES, breedsFor, COLORS } from "@/lib/pet-taxonomy";
import { Plus, Trash2, PawPrint, LogOut, DollarSign, X } from "lucide-react";

const todayStr = () => new Date().toISOString().slice(0, 10);
type Pet = { pet_type: string; pet_breed: string; pet_color: string; pet_name: string; description: string; feeding_notes: string; meds_notes: string };
const blankPet = (): Pet => ({ pet_type: "Dog", pet_breed: "", pet_color: "", pet_name: "", description: "", feeding_notes: "", meds_notes: "" });

export function NewStayButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState<any>({
    owner_name: "", owner_contact: "", owner_email: "",
    check_in_date: todayStr(), check_out_date: todayStr(),
    payment_status: "unpaid", amount: "", amount_paid: "",
    brought_cage: false, brought_food: false, brought_toys: false, brought_bags: false,
    brought_other: "", notes: "",
  });
  const [pets, setPets] = useState<Pet[]>([blankPet()]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setPet = (i: number, k: keyof Pet, v: string) =>
    setPets((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v, ...(k === "pet_type" ? { pet_breed: "" } : {}) } : p)));

  async function submit() {
    setBusy(true);
    try {
      const r = await createStay({ ...form, pets });
      if (r?.error) { alert(r.error); return; }
      setOpen(false);
      setForm({ owner_name: "", owner_contact: "", owner_email: "", check_in_date: todayStr(), check_out_date: todayStr(), payment_status: "unpaid", amount: "", amount_paid: "", brought_cage: false, brought_food: false, brought_toys: false, brought_bags: false, brought_other: "", notes: "" });
      setPets([blankPet()]);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New Boarding</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="card relative my-6 w-full max-w-2xl space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">New Boarding</h3>
              <button className="btn-secondary !px-2 !py-1" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>

            {/* Owner */}
            <div>
              <p className="label mb-1">Owner</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input className="input" placeholder="Owner name *" value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} />
                <input className="input" placeholder="Contact number *" value={form.owner_contact} onChange={(e) => set("owner_contact", e.target.value)} />
                <input className="input" placeholder="Email (optional)" value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} />
              </div>
            </div>

            {/* Dates + payment */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div><label className="label">Check-in *</label><input type="date" className="input" value={form.check_in_date} onChange={(e) => set("check_in_date", e.target.value)} /></div>
              <div><label className="label">Check-out *</label><input type="date" className="input" value={form.check_out_date} onChange={(e) => set("check_out_date", e.target.value)} /></div>
              <div>
                <label className="label">Payment</label>
                <select className="input" value={form.payment_status} onChange={(e) => set("payment_status", e.target.value)}>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div><label className="label">Amount (AED)</label><input type="number" className="input" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></div>
            </div>

            {/* Items brought */}
            <div>
              <p className="label mb-1">Items owner brought</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {[["brought_cage", "Cage"], ["brought_food", "Food"], ["brought_toys", "Toys"], ["brought_bags", "Bags"]].map(([k, lbl]) => (
                  <label key={k} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} /> {lbl}
                  </label>
                ))}
                <input className="input flex-1 min-w-[160px]" placeholder="Other items…" value={form.brought_other} onChange={(e) => set("brought_other", e.target.value)} />
              </div>
            </div>

            {/* Pets */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="label">Pets ({pets.length})</p>
                <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => setPets((ps) => [...ps, blankPet()])}><Plus size={12} /> Add pet</button>
              </div>
              <div className="space-y-2">
                {pets.map((p, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-500"><PawPrint size={12} /> Pet {i + 1}</span>
                      {pets.length > 1 && <button className="text-red-500" onClick={() => setPets((ps) => ps.filter((_, j) => j !== i))}><Trash2 size={13} /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <select className="input" value={p.pet_type} onChange={(e) => setPet(i, "pet_type", e.target.value)}>
                        {PET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select className="input" value={p.pet_breed} onChange={(e) => setPet(i, "pet_breed", e.target.value)}>
                        <option value="">Breed…</option>
                        {breedsFor(p.pet_type).map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <select className="input" value={p.pet_color} onChange={(e) => setPet(i, "pet_color", e.target.value)}>
                        <option value="">Color…</option>
                        {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input className="input" placeholder="Pet name" value={p.pet_name} onChange={(e) => setPet(i, "pet_name", e.target.value)} />
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <input className="input" placeholder="Description / markings" value={p.description} onChange={(e) => setPet(i, "description", e.target.value)} />
                      <input className="input" placeholder="Feeding notes" value={p.feeding_notes} onChange={(e) => setPet(i, "feeding_notes", e.target.value)} />
                      <input className="input" placeholder="Medication notes" value={p.meds_notes} onChange={(e) => setPet(i, "meds_notes", e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <textarea className="input" rows={2} placeholder="General notes (optional)" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            <button className="btn-primary w-full" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Save boarding"}</button>
          </div>
        </div>
      )}
    </>
  );
}

export function StayActions({ stay }: { stay: any }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (fn: () => Promise<any>) => start(async () => { const r = await fn(); if (r?.error) alert(r.error); router.refresh(); });
  return (
    <div className="flex flex-wrap gap-1">
      {stay.payment_status !== "paid" && (
        <button className="btn-secondary !px-2 !py-1 text-xs" disabled={pending} title="Mark paid"
          onClick={() => act(() => setPayment(stay.id, "paid"))}><DollarSign size={13} /> Paid</button>
      )}
      {stay.status === "active" && (
        <button className="btn-secondary !px-2 !py-1 text-xs" disabled={pending} title="Check out"
          onClick={() => { if (confirm("Check out this boarding?")) act(() => setStayStatus(stay.id, "checked_out")); }}><LogOut size={13} /> Check out</button>
      )}
    </div>
  );
}
