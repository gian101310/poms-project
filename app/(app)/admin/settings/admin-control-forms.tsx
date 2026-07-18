"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, RotateCcw, CalendarClock } from "lucide-react";
import { resetGeneratedTasks, setBooleanSetting } from "./actions";

function AdminPassword({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      className="input"
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Admin action password"
      required
    />
  );
}

export function ProjectControls({
  projectEnabled,
  schedulingEnabled,
}: {
  projectEnabled: boolean;
  schedulingEnabled: boolean;
}) {
  const [password, setPassword] = useState("");
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [pending, start] = useTransition();
  const router = useRouter();

  function run(action: (fd: FormData) => Promise<any>, success: string) {
    const fd = new FormData();
    fd.set("admin_password", password);
    fd.set("date_from", from);
    fd.set("date_to", to);
    start(async () => {
      const result = await action(fd);
      if (result?.error) alert(result.error);
      else alert(success);
      router.refresh();
    });
  }

  return (
    <div className="mb-6 grid gap-3 lg:grid-cols-3">
      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Power size={17} />
          <h2 className="font-semibold">Project Access</h2>
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Turn the portal off for everyone except super admins.
        </p>
        <AdminPassword value={password} onChange={setPassword} />
        <button
          className={projectEnabled ? "btn-secondary mt-3 w-full" : "btn-primary mt-3 w-full"}
          disabled={pending}
          onClick={() => run((fd) => setBooleanSetting("project_enabled", !projectEnabled, fd), projectEnabled ? "Project turned off." : "Project turned on.")}
        >
          {projectEnabled ? "Turn Project Off" : "Turn Project On"}
        </button>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock size={17} />
          <h2 className="font-semibold">Task Scheduling</h2>
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Control whether the daily cron creates staff checklist tasks.
        </p>
        <AdminPassword value={password} onChange={setPassword} />
        <button
          className={schedulingEnabled ? "btn-secondary mt-3 w-full" : "btn-primary mt-3 w-full"}
          disabled={pending}
          onClick={() => run((fd) => setBooleanSetting("task_scheduling_enabled", !schedulingEnabled, fd), schedulingEnabled ? "Automatic scheduling turned off." : "Automatic scheduling turned on.")}
        >
          {schedulingEnabled ? "Turn Scheduling Off" : "Turn Scheduling On"}
        </button>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2">
          <RotateCcw size={17} />
          <h2 className="font-semibold">Reset Assigned Tasks</h2>
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Closes open generated checklist assignments for the selected dates so staff no longer see them.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="mt-2">
          <AdminPassword value={password} onChange={setPassword} />
        </div>
        <button
          className="btn-secondary mt-3 w-full"
          disabled={pending}
          onClick={() => {
            if (!confirm("Reset open generated tasks for this date range? History is kept in the audit trail.")) return;
            run(resetGeneratedTasks, "Generated open task assignments reset.");
          }}
        >
          Reset Open Tasks
        </button>
      </div>
    </div>
  );
}
