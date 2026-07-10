"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIncident } from "./actions";

const CATEGORIES = ["animal_health", "injury", "customer", "equipment", "security", "hygiene", "other"];

export function IncidentForm({ departments }: { departments: any[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form className="card max-w-2xl space-y-3 p-5"
      action={(fd) => start(async () => {
        const r = await createIncident(fd);
        if (r?.error) alert(r.error);
        else router.push("/incidents");
        router.refresh();
      })}>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Category *</label>
          <select name="category" className="input" required>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Department</label>
          <select name="department_id" className="input">
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">When did it happen?</label>
          <input name="occurred_at" type="datetime-local" className="input" />
        </div>
      </div>
      <div><label className="label">Description *</label><textarea name="description" className="input" rows={4} required /></div>
      <div><label className="label">Root Cause (if known)</label><textarea name="root_cause" className="input" rows={2} /></div>
      <div><label className="label">Corrective Action Taken</label><textarea name="corrective_action" className="input" rows={2} /></div>
      <button className="btn-primary" disabled={pending}>{pending ? "Submitting…" : "Submit Incident Report"}</button>
    </form>
  );
}
