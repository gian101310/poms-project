"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyTask, bounceTask } from "./actions";
import { fmtTime } from "@/lib/tz";
import { CheckCheck, Undo2 } from "lucide-react";

export function VerifyCard({ task }: { task: any }) {
  const [remarks, setRemarks] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const inst = task.checklist_instances;

  const act = (fn: () => Promise<any>) =>
    start(async () => { const r = await fn(); if (r?.error) alert(r.error); router.refresh(); });

  return (
    <div className="card p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{task.title}</p>
          <p className="text-xs text-slate-500">
            {inst?.profiles?.full_name} ({inst?.profiles?.employee_code}) · {inst?.departments?.name} · {inst?.shifts?.name} · done {fmtTime(task.completed_at)}
            {task.duration_minutes != null && ` · ${task.duration_minutes} min`}
          </p>
          {task.employee_remarks && (
            <p className="mt-1 rounded bg-slate-50 p-2 text-sm dark:bg-slate-800">“{task.employee_remarks}”</p>
          )}
          {(task.task_photos ?? []).length > 0 && (
            <p className="mt-1 text-xs text-slate-400">{task.task_photos.length} photo(s) attached</p>
          )}
          <input className="input mt-2" placeholder="Supervisor remarks (optional)" value={remarks}
            onChange={(e) => setRemarks(e.target.value)} />
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button className="btn-primary !py-1.5" disabled={pending} onClick={() => act(() => verifyTask(task.id, remarks))}>
            <CheckCheck size={14} /> Verify
          </button>
          <button className="btn-secondary !py-1.5" disabled={pending} onClick={() => act(() => bounceTask(task.id, remarks))}>
            <Undo2 size={14} /> Redo
          </button>
        </div>
      </div>
    </div>
  );
}
