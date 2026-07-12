"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBranch, updateBranch } from "./actions";
import { Plus, Pencil, X } from "lucide-react";

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative w-full max-w-md space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn-secondary !px-2 !py-1" onClick={onClose} type="button"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BranchForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New Branch</button>
      {open && (
        <Modal title="New Branch" onClose={() => setOpen(false)}>
          <form className="space-y-3" action={(fd) => start(async () => {
            const r = await createBranch(fd);
            if (r?.error) alert(r.error); else setOpen(false);
            router.refresh();
          })}>
            <div><label className="label">Branch name *</label><input name="name" className="input" placeholder="Meadows Village" required /></div>
            <div><label className="label">Code</label><input name="code" className="input" placeholder="MEADOWS" /></div>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating..." : "Create branch"}</button>
          </form>
        </Modal>
      )}
    </>
  );
}

export function EditBranch({ branch }: { branch: any }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary !px-2 !py-1" title="Edit branch" onClick={() => setOpen(true)}><Pencil size={13} /></button>
      {open && (
        <Modal title={`Edit ${branch.name}`} onClose={() => setOpen(false)}>
          <form className="space-y-3" action={(fd) => start(async () => {
            const r = await updateBranch(branch.id, fd);
            if (r?.error) alert(r.error); else setOpen(false);
            router.refresh();
          })}>
            <div><label className="label">Branch name *</label><input name="name" className="input" defaultValue={branch.name} required /></div>
            <div><label className="label">Code *</label><input name="code" className="input" defaultValue={branch.code} required /></div>
            <label className="flex items-center gap-2 text-sm"><input name="is_active" type="checkbox" defaultChecked={branch.is_active} /> Active</label>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving..." : "Save branch"}</button>
          </form>
        </Modal>
      )}
    </>
  );
}
