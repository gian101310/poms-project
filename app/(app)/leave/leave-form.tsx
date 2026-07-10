"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestLeave, reviewLeave } from "./actions";
import { Plus, Check, X } from "lucide-react";

export function LeaveForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Request Leave</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <form className="card relative w-full max-w-md space-y-3 p-5"
            action={(fd) => start(async () => {
              const r = await requestLeave(fd);
              if (r?.error) alert(r.error); else setOpen(false);
              router.refresh();
            })}>
            <h3 className="text-lg font-semibold">Request Leave</h3>
            <div>
              <label className="label">Type</label>
              <select name="leave_type" className="input">
                {["annual", "sick", "emergency", "unpaid"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">From *</label><input name="date_from" type="date" className="input" required /></div>
              <div><label className="label">To *</label><input name="date_to" type="date" className="input" required /></div>
            </div>
            <div><label className="label">Reason</label><textarea name="reason" className="input" rows={2} /></div>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Submitting…" : "Submit"}</button>
          </form>
        </div>
      )}
    </>
  );
}

export function LeaveReview({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (status: "approved" | "rejected") =>
    start(async () => { const r = await reviewLeave(id, status); if (r?.error) alert(r.error); router.refresh(); });
  return (
    <div className="flex gap-1">
      <button className="btn-primary !px-2 !py-1" disabled={pending} onClick={() => act("approved")}><Check size={14} /></button>
      <button className="btn-danger !px-2 !py-1" disabled={pending} onClick={() => act("rejected")}><X size={14} /></button>
    </div>
  );
}
