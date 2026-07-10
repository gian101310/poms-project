"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHandover, approveHandover, acknowledgeHandover } from "./actions";
import { Badge } from "@/components/ui";
import { Send, Save, ThumbsUp, Eye } from "lucide-react";

const FIELDS: { key: string; label: string }[] = [
  { key: "completed_summary", label: "Completed Tasks Summary" },
  { key: "pending_summary", label: "Pending Tasks" },
  { key: "issues", label: "Issues" },
  { key: "animal_concerns", label: "Animal Concerns" },
  { key: "inventory_concerns", label: "Inventory Concerns" },
  { key: "maintenance_requests", label: "Maintenance Requests" },
  { key: "customer_followups", label: "Customer Follow-ups" },
  { key: "notes", label: "Additional Notes" },
];

export function HandoverForm({ existing, departmentId, shiftId, deptName, shiftName }: any) {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, existing?.[f.key] ?? ""]))
  );
  const [pending, start] = useTransition();
  const router = useRouter();
  const locked = existing && existing.status !== "draft";

  const submit = (asDraft: boolean) =>
    start(async () => {
      const r = await saveHandover({ ...form, department_id: departmentId, shift_id: shiftId }, asDraft);
      if (r?.error) alert(r.error);
      router.refresh();
    });

  if (locked) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <Badge value={existing.status} />
          <p className="text-sm text-slate-500">Handover submitted for {deptName ?? "your department"} · {shiftName ?? ""}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <p className="mb-3 text-sm text-slate-500">{deptName} · {shiftName}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <textarea className="input" rows={2} value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button className="btn-secondary" disabled={pending} onClick={() => submit(true)}>
          <Save size={15} /> Save draft
        </button>
        <button className="btn-primary" disabled={pending} onClick={() => submit(false)}>
          <Send size={15} /> Submit handover
        </button>
      </div>
    </div>
  );
}

export function ApproveButtons({ id, ackOnly }: { id: string; ackOnly?: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (fn: () => Promise<any>) =>
    start(async () => { const r = await fn(); if (r?.error) alert(r.error); router.refresh(); });

  if (ackOnly) {
    return (
      <button className="btn-secondary !py-1" disabled={pending} onClick={() => act(() => acknowledgeHandover(id))}>
        <Eye size={14} /> Acknowledge
      </button>
    );
  }
  return (
    <button className="btn-primary !py-1" disabled={pending} onClick={() => act(() => approveHandover(id))}>
      <ThumbsUp size={14} /> Approve
    </button>
  );
}
