"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShift, updateShift, assignSchedule, generateRotation } from "./actions";
import { Plus, CalendarPlus, Pencil, RefreshCcw } from "lucide-react";

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

function ShiftFields({ shift }: { shift?: any }) {
  return (
    <>
      <div><label className="label">Name *</label><input name="name" className="input" defaultValue={shift?.name} required /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Start *</label><input name="start_time" type="time" className="input" defaultValue={shift?.start_time?.slice(0, 5)} required /></div>
        <div><label className="label">End *</label><input name="end_time" type="time" className="input" defaultValue={shift?.end_time?.slice(0, 5)} required /></div>
        <div><label className="label">Grace min</label><input name="grace_minutes" type="number" className="input" defaultValue={shift?.grace_minutes ?? 10} /></div>
      </div>
      <div>
        <label className="label">Standard paid hours (per day)</label>
        <input name="standard_hours" type="number" step="0.5" className="input"
          defaultValue={shift?.standard_minutes != null ? shift.standard_minutes / 60 : ""} placeholder="e.g. 9" />
        <p className="mt-1 text-xs text-slate-400">
          Time on shift beyond this counts as overtime. Leave empty for no built-in overtime.
          Example: 08:00–18:00 with 9 standard hours ⇒ 1h overtime per day.
        </p>
      </div>
      {shift && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={shift.is_active} /> Active
        </label>
      )}
    </>
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
          <ShiftFields />
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create Shift"}</button>
        </form>
      </Modal>
    </>
  );
}

export function EditShift({ shift }: { shift: any }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary !px-2 !py-1" onClick={() => setOpen(true)}><Pencil size={13} /></button>
      <Modal title={`Edit ${shift.name}`} open={open} onClose={() => setOpen(false)}>
        <form className="space-y-3" action={(fd) => start(async () => {
          const r = await updateShift(shift.id, fd);
          if (r?.error) alert(r.error); else setOpen(false);
          router.refresh();
        })}>
          <ShiftFields shift={shift} />
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save Changes"}</button>
          <p className="text-xs text-slate-400">Changes apply from the next attendance calculation — past records keep their snapshot.</p>
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
      <button className="btn-secondary" onClick={() => setOpen(true)}><CalendarPlus size={16} /> Assign Schedule</button>
      <Modal title="Assign Schedule (single employee)" open={open} onClose={() => setOpen(false)}>
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
        </form>
      </Modal>
    </>
  );
}

export function RotationForm({ employees, shifts }: { employees: any[]; shifts: any[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><RefreshCcw size={16} /> Rotation Pair</button>
      <Modal title="Rotating Counterpart Pair" open={open} onClose={() => setOpen(false)}>
        <form className="space-y-3" action={(fd) => start(async () => {
          const r: any = await generateRotation(fd);
          if (r?.error) alert(r.error);
          else { alert(`Rotation created: ${r.created} schedule entries.`); setOpen(false); }
          router.refresh();
        })}>
          <p className="text-xs text-slate-400">
            Two employees swap shifts on a fixed cycle (e.g. every 2 weeks, on Monday).
            Existing entries for the same dates are overwritten — approved leave days are skipped.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Employee A *</label>
              <select name="profile_a" className="input" required>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">A starts on *</label>
              <select name="shift_a" className="input" required>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Employee B *</label>
              <select name="profile_b" className="input" required>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">B starts on *</label>
              <select name="shift_b" className="input" required>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="label">Start (a Monday) *</label><input name="start_date" type="date" className="input" required /></div>
            <div><label className="label">Until *</label><input name="until_date" type="date" className="input" required /></div>
            <div>
              <label className="label">Swap every</label>
              <select name="rotate_weeks" className="input" defaultValue="2">
                {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w} week{w > 1 ? "s" : ""}</option>)}
              </select>
            </div>
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
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Generating…" : "Generate Rotation"}</button>
        </form>
      </Modal>
    </>
  );
}
