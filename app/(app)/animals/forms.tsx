"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnimal, addWelfareRecord, setAnimalStatus } from "./actions";
import { Plus, HeartPulse } from "lucide-react";

function Modal({ title, open, onClose, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative max-h-[85vh] w-full max-w-lg overflow-y-auto p-5">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function AnimalForm({ departments, canAdd }: { departments: any[]; canAdd: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!canAdd) return null;

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add Animal</button>
      <Modal title="Register Animal" open={open} onClose={() => setOpen(false)}>
        <form action={(fd) => start(async () => {
          const r = await createAnimal(fd);
          if (r?.error) alert(r.error); else setOpen(false);
          router.refresh();
        })} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Tag Code *</label><input name="tag_code" className="input" required /></div>
            <div>
              <label className="label">Department *</label>
              <select name="department_id" className="input" required>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="label">Species *</label><input name="species" className="input" required /></div>
            <div><label className="label">Breed</label><input name="breed" className="input" /></div>
            <div><label className="label">Name</label><input name="name" className="input" /></div>
            <div><label className="label">Enclosure</label><input name="enclosure" className="input" /></div>
            <div><label className="label">Intake Date</label><input name="intake_date" type="date" className="input" /></div>
          </div>
          <div><label className="label">Notes</label><textarea name="notes" className="input" rows={2} /></div>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Register"}</button>
        </form>
      </Modal>
    </>
  );
}

const RECORD_TYPES = ["observation", "medication", "isolation", "mortality", "vaccination", "special_care", "daily_monitoring"];

export function WelfareForm({ animalId }: { animalId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("observation");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><HeartPulse size={16} /> Add Record</button>
      <Modal title="New Welfare Record" open={open} onClose={() => setOpen(false)}>
        <form action={(fd) => start(async () => {
          const r = await addWelfareRecord(animalId, fd);
          if (r?.error) alert(r.error); else setOpen(false);
          router.refresh();
        })} className="space-y-3">
          <div>
            <label className="label">Type</label>
            <select name="record_type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {RECORD_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          {type === "medication" && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Medicine</label><input name="d_medicine" className="input" /></div>
              <div><label className="label">Dose</label><input name="d_dose" className="input" /></div>
            </div>
          )}
          {type === "vaccination" && (
            <div><label className="label">Vaccine</label><input name="d_vaccine" className="input" /></div>
          )}
          {type === "daily_monitoring" && (
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Temp (°C)</label><input name="d_temperature" className="input" /></div>
              <div><label className="label">Food</label><input name="d_food" className="input" /></div>
              <div><label className="label">Water</label><input name="d_water" className="input" /></div>
            </div>
          )}
          <div><label className="label">Remarks *</label><textarea name="remarks" className="input" rows={3} required /></div>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save record"}</button>
        </form>
      </Modal>
    </>
  );
}

const STATUSES = ["available", "reserved", "sold", "isolated", "under_treatment", "deceased"];

export function StatusSelect({ animalId, current }: { animalId: string; current: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <select className="input !w-auto" defaultValue={current} disabled={pending}
      onChange={(e) => start(async () => {
        const r = await setAnimalStatus(animalId, e.target.value);
        if (r?.error) alert(r.error);
        router.refresh();
      })}>
      {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
    </select>
  );
}
