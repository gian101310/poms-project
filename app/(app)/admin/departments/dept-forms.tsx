"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDepartment, updateDepartment, toggleDepartment } from "./actions";
import { Plus, Power, Pencil } from "lucide-react";

export function EditDept({ dept }: { dept: any }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary !px-2 !py-1" onClick={() => setOpen(true)}><Pencil size={13} /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <form className="card relative w-full max-w-sm space-y-3 p-5"
            action={(fd) => start(async () => {
              const r = await updateDepartment(dept.id, fd);
              if (r?.error) alert(r.error); else setOpen(false);
              router.refresh();
            })}>
            <h3 className="text-lg font-semibold">Edit {dept.name}</h3>
            <div><label className="label">Name *</label><input name="name" className="input" defaultValue={dept.name} required /></div>
            <div><label className="label">Code *</label><input name="code" className="input" defaultValue={dept.code} required /></div>
            <p className="text-xs text-slate-400">The code links default checklists and inspection criteria (BIRDS, DOGS, SALES, CASHIER…).</p>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          </form>
        </div>
      )}
    </>
  );
}

export function DeptForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New Department</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <form className="card relative w-full max-w-sm space-y-3 p-5"
            action={(fd) => start(async () => {
              const r = await createDepartment(fd);
              if (r?.error) alert(r.error); else setOpen(false);
              router.refresh();
            })}>
            <h3 className="text-lg font-semibold">New Department</h3>
            <div><label className="label">Name *</label><input name="name" className="input" required /></div>
            <div><label className="label">Code *</label><input name="code" className="input" placeholder="REPTILES" required /></div>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create"}</button>
          </form>
        </div>
      )}
    </>
  );
}

export function DeptToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button className={`!px-2 !py-1 ${isActive ? "btn-danger" : "btn-primary"}`} disabled={pending}
      onClick={() => start(async () => {
        const r = await toggleDepartment(id, !isActive);
        if (r?.error) alert(r.error);
        router.refresh();
      })}>
      <Power size={13} />
    </button>
  );
}
