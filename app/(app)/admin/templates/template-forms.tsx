"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTemplate, addTemplateTask, removeTemplateTask } from "./actions";
import { Plus, Trash2 } from "lucide-react";

const TAGS = ["low_stock", "maintenance", "animal_health", "cleaning", "customer_concern", "equipment"];

export function TemplateForm({ departments, shifts }: { departments: any[]; shifts: any[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New Template</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <form className="card relative w-full max-w-md space-y-3 p-5"
            action={(fd) => start(async () => {
              const r = await createTemplate(fd);
              if (r?.error) alert(r.error); else setOpen(false);
              router.refresh();
            })}>
            <h3 className="text-lg font-semibold">New Checklist Template</h3>
            <div><label className="label">Name *</label><input name="name" className="input" placeholder="Birds — Opening" required /></div>
            <div>
              <label className="label">Department *</label>
              <select name="department_id" className="input" required>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Shift *</label>
              <select name="shift_id" className="input" required>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create Template"}</button>
            <p className="text-xs text-slate-400">If an active template already exists for this department + shift, it will be replaced by this new version (history is preserved).</p>
          </form>
        </div>
      )}
    </>
  );
}

export function TaskEditor({ templateId, tasks }: { templateId: string; tasks: any[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-slate-400">No tasks yet — add the first one below.</p>
        )}
        {tasks.map((t) => (
          <div key={t.id} className="card flex items-center justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t.sort_order + 1}. {t.title}</p>
              <p className="text-xs text-slate-500">
                {t.priority}{t.requires_photo ? " · photo required" : ""}
                {(t.tags ?? []).length ? " · " + t.tags.join(", ") : ""}
                {" · "}{t.recurrence?.type === "daily" ? "daily" : t.recurrence?.type === "weekdays" ? "weekly" : t.recurrence?.type}
              </p>
              {t.description && <p className="text-xs text-slate-400">{t.description}</p>}
            </div>
            <button className="btn-secondary !px-2 !py-1.5" disabled={pending}
              onClick={() => start(async () => {
                if (!confirm("Remove this task from the template?")) return;
                const r = await removeTemplateTask(t.id);
                if (r?.error) alert(r.error);
                router.refresh();
              })}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <form className="card space-y-3 p-4"
        action={(fd) => start(async () => {
          const r = await addTemplateTask(templateId, fd);
          if (r?.error) alert(r.error);
          router.refresh();
        })}>
        <h3 className="font-semibold">Add Task</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><label className="label">Title *</label><input name="title" className="input" required /></div>
          <div className="md:col-span-2"><label className="label">Description</label><input name="description" className="input" /></div>
          <div>
            <label className="label">Priority</label>
            <select name="priority" className="input" defaultValue="normal">
              {["low", "normal", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Recurrence</label>
            <select name="recurrence_type" className="input" defaultValue="daily">
              <option value="daily">Every day</option>
              <option value="mon">Mondays only</option>
              <option value="fri">Fridays only</option>
              <option value="every_3_days">Every 3 days</option>
              <option value="monthly_1">1st of month</option>
            </select>
          </div>
          <div><label className="label">Est. minutes</label><input name="estimated_minutes" type="number" className="input" /></div>
          <div className="flex items-end gap-2 pb-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_photo" /> Photo required</label>
          </div>
        </div>
        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-3">
            {TAGS.map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="tags" value={t} /> {t.replace(/_/g, " ")}
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary" disabled={pending}>{pending ? "Adding…" : "Add Task"}</button>
      </form>
    </div>
  );
}
