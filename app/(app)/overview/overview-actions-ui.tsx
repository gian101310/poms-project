"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyTask } from "../verify/actions";
import { addFollowup } from "./actions";
import { CheckCheck, NotebookPen } from "lucide-react";

export function InlineVerify({ taskId }: { taskId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button className="btn-primary !px-2 !py-1" disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await verifyTask(taskId, "");
          if (r?.error) alert(r.error);
          router.refresh();
        });
      }}>
      <CheckCheck size={13} />
    </button>
  );
}

export function FollowupButton({ departmentId, departmentName, profileId, profileName, small }: {
  departmentId: string; departmentName: string; profileId?: string; profileName?: string; small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <>
      <button className={`btn-secondary ${small ? "!px-2 !py-1 !text-xs" : ""}`}
        onClick={(e) => { e.preventDefault(); setOpen(true); }}>
        <NotebookPen size={small ? 13 : 15} /> {small ? "" : "Add Follow-up"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <form className="card relative w-full max-w-md space-y-3 p-5"
            action={(fd) => start(async () => {
              const r = await addFollowup(fd);
              if (r?.error) alert(r.error);
              else { alert("Follow-up queued — it will appear on the checklist that day."); setOpen(false); }
              router.refresh();
            })}>
            <h3 className="text-lg font-semibold">Follow-up Task</h3>
            <p className="text-xs text-slate-400">
              For {profileName ? <b>{profileName}</b> : <b>everyone in {departmentName}</b>} — appears
              automatically on their checklist on the chosen date, marked high priority.
            </p>
            <input type="hidden" name="department_id" value={departmentId} />
            {profileId && <input type="hidden" name="profile_id" value={profileId} />}
            <div><label className="label">Task title *</label><input name="title" className="input" placeholder="Re-clean aviary filters properly" required /></div>
            <div><label className="label">Note / instructions</label><textarea name="note" className="input" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">On date *</label><input name="target_date" type="date" className="input" defaultValue={tomorrow} required /></div>
              <div>
                <label className="label">Priority</label>
                <select name="priority" className="input" defaultValue="high">
                  {["normal", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Queue Follow-up"}</button>
          </form>
        </div>
      )}
    </>
  );
}
