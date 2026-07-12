"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDepartment, updateDepartment, toggleDepartment,
  createSection, updateSection, toggleSection, deleteSection,
} from "./actions";
import { Plus, Power, Pencil, Trash2 } from "lucide-react";

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative w-full max-w-sm space-y-3 p-5">{children}</div>
    </div>
  );
}

// ---------- DEPARTMENTS ----------
export function EditDept({ dept }: { dept: any }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary !px-2 !py-1" title="Edit department" onClick={() => setOpen(true)}><Pencil size={13} /></button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <form className="space-y-3"
            action={(fd) => start(async () => {
              const r = await updateDepartment(dept.id, fd);
              if (r?.error) alert(r.error); else setOpen(false);
              router.refresh();
            })}>
            <h3 className="text-lg font-semibold">Edit {dept.name}</h3>
            <div><label className="label">Name *</label><input name="name" className="input" defaultValue={dept.name} required /></div>
            <div><label className="label">Code *</label><input name="code" className="input" defaultValue={dept.code} required /></div>
            <p className="text-xs text-slate-400">The code links default checklists and inspection criteria (BIRDS, DOGS, SALES…).</p>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          </form>
        </Modal>
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
        <Modal onClose={() => setOpen(false)}>
          <form className="space-y-3"
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
        </Modal>
      )}
    </>
  );
}

export function DeptToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button className={`!px-2 !py-1 ${isActive ? "btn-danger" : "btn-primary"}`} disabled={pending}
      title={isActive ? "Deactivate" : "Activate"}
      onClick={() => start(async () => {
        const r = await toggleDepartment(id, !isActive);
        if (r?.error) alert(r.error);
        router.refresh();
      })}>
      <Power size={13} />
    </button>
  );
}

// ---------- SECTIONS ----------
export function SectionForm({ departmentId, deptName }: { departmentId: string; deptName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => setOpen(true)}><Plus size={13} /> Add section</button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <form className="space-y-3"
            action={(fd) => start(async () => {
              const r = await createSection(departmentId, fd);
              if (r?.error) alert(r.error); else setOpen(false);
              router.refresh();
            })}>
            <h3 className="text-lg font-semibold">New section in {deptName}</h3>
            <div><label className="label">Name *</label><input name="name" className="input" placeholder="Dog Dry Food" required /></div>
            <div><label className="label">Code</label><input name="code" className="input" placeholder="optional" /></div>
            <div><label className="label">Sort order</label><input name="sort_order" type="number" className="input" defaultValue={0} /></div>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create section"}</button>
          </form>
        </Modal>
      )}
    </>
  );
}

export function EditSection({ section }: { section: any }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary !px-1.5 !py-0.5" title="Edit section" onClick={() => setOpen(true)}><Pencil size={12} /></button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <form className="space-y-3"
            action={(fd) => start(async () => {
              const r = await updateSection(section.id, fd);
              if (r?.error) alert(r.error); else setOpen(false);
              router.refresh();
            })}>
            <h3 className="text-lg font-semibold">Edit section</h3>
            <div><label className="label">Name *</label><input name="name" className="input" defaultValue={section.name} required /></div>
            <div><label className="label">Code</label><input name="code" className="input" defaultValue={section.code ?? ""} /></div>
            <div><label className="label">Sort order</label><input name="sort_order" type="number" className="input" defaultValue={section.sort_order ?? 0} /></div>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          </form>
        </Modal>
      )}
    </>
  );
}

export function SectionToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button className={`!px-1.5 !py-0.5 ${isActive ? "btn-danger" : "btn-primary"}`} disabled={pending}
      title={isActive ? "Deactivate" : "Activate"}
      onClick={() => start(async () => {
        const r = await toggleSection(id, !isActive);
        if (r?.error) alert(r.error);
        router.refresh();
      })}>
      <Power size={12} />
    </button>
  );
}

export function DeleteSection({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button className="btn-secondary !px-1.5 !py-0.5 text-red-500" title="Delete section" disabled={pending}
      onClick={() => start(async () => {
        if (!confirm(`Delete section "${name}"? This cannot be undone.`)) return;
        const r = await deleteSection(id);
        if (r?.error) alert(r.error);
        router.refresh();
      })}>
      <Trash2 size={12} />
    </button>
  );
}
