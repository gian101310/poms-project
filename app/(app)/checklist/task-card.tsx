"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { startTask, completeTask, saveRemarks } from "./actions";
import { Badge } from "@/components/ui";
import { Play, Check, Camera, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

export function TaskCard({ task }: { task: any }) {
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState(task.employee_remarks ?? "");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const act = (fn: () => Promise<any>) =>
    start(async () => {
      const r = await fn();
      if (r?.error) alert(r.error);
      router.refresh();
    });

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${task.instance_id}/${task.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("task-photos").upload(path, file);
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("task_photos").insert({ task_id: task.id, storage_path: path, uploaded_by: user!.id });
      alert("Photo uploaded.");
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`card p-3 ${task.is_overdue && !["completed", "verified"].includes(task.status) ? "border-red-300 dark:border-red-800" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{task.title}</p>
            <Badge value={task.status} />
            {task.priority !== "normal" && <Badge value={task.priority} />}
            {task.is_overdue && !["completed", "verified"].includes(task.status) && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><AlertCircle size={12} /> overdue</span>
            )}
          </div>
          {task.description && <p className="mt-0.5 text-sm text-slate-500">{task.description}</p>}
          {(task.tags ?? []).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {task.tags.map((tag: string) => (
                <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800">{tag.replace(/_/g, " ")}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {task.status === "pending" && (
            <button className="btn-secondary !py-1.5" disabled={pending} onClick={() => act(() => startTask(task.id))}>
              <Play size={14} /> Start
            </button>
          )}
          {["pending", "started"].includes(task.status) && (
            <button className="btn-primary !py-1.5" disabled={pending} onClick={() => act(() => completeTask(task.id))}>
              <Check size={14} /> Done
            </button>
          )}
          <button className="btn-secondary !px-2 !py-1.5" onClick={() => setOpen(!open)}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div>
            <label className="label">My Remarks</label>
            <textarea className="input" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            <button className="btn-secondary mt-1 !py-1" disabled={pending}
              onClick={() => act(() => saveRemarks(task.id, remarks))}>Save remarks</button>
          </div>
          {task.supervisor_remarks && (
            <div>
              <label className="label">Supervisor Remarks</label>
              <p className="rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800">{task.supervisor_remarks}</p>
            </div>
          )}
          <div>
            <label className="btn-secondary !py-1.5 cursor-pointer">
              <Camera size={14} /> {uploading ? "Uploading…" : task.requires_photo ? "Add photo (required)" : "Add photo"}
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
            </label>
          </div>
          {task.verified_at && (
            <p className="text-xs text-slate-400">Verified {new Date(task.verified_at).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
}
