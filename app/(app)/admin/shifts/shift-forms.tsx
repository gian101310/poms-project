"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShift, assignSchedule } from "./actions";
import { Plus, CalendarPlus } from "lucide-react";

function Modal({ title, open, onClose, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative max-h-[85vh] w-full max-w-md overflow-y-auto p-5">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function ShiftForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}><Plus size={16} /> New Shift</button>
      <Modal title="New Shift" open={open} onClose={() => setOpen(false)}>
        <form className="space-y-3" action={(fd) => start(async () => {
          const r = await createShift(fd);
          if (r?.error) alert(r.error); else setOpen(false);
          router.refresh();
        })}>
          <div><label className="label">Name *</label><input name="name" className="input" placeholder="Night Shift" required /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Start *</label><input name="start_time" type="time" className="input" required /></div>
            <div><label className="label">End *</label><input name="end_time" type="time" className="input" required /></div>
            <div><label className="label">Grace min</label><input name="grace_minutes" type="number" defaultValue={10} className="input" /></div>
          </div>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create Shift"}</button>
        </form>
      </Modal>
    </>
  );
}

export function ScheduleForm({ employees, shifts }: { employees: any[]; shifts: any[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><CalendarPlus size={16} /> Assign Schedule</button>
      <Modal title="Assign Schedule" open={open} onClose={() => setOpen(false)}>
        <form className="space-y-3" action={(fd) => start(async () => {
          const r = await assignSchedule(fd);
          if (r?.error) alert(r.error); else setOpen(false);
          router.refresh();
        })}>
          <div>
            <label className="label">Employee *</label>
            <select name="profile_id" className="input" required>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Shift *</label>
            <select name="shift_id" className="input" required>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">From *</label><input name="date_from" type="date" className="input" required /></div>
            <div><label className="label">To *</label><input name="date_to" type="date" className="input" required /></div>
          </div>
          <div>
            <label className="label">Work days</label>
            <div className="grid grid-cols-4 gap-1 text-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <label key={d} className="flex items-center gap-1.5">
                  <input type="checkbox" name="days" value={i} defaultChecked={i !== 0} /> {d}
                </label>
              ))}
            </div>
          </div>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Assigning…" : "Assign"}</button>
          <p className="text-xs text-slate-400">Creates one schedule entry per selected day in the range. Daily checklists generate automatically from these.</p>
        </form>
      </Modal>
    </>
  );
}
