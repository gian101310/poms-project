"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendBroadcast } from "./actions";
import { Send, Users, User } from "lucide-react";

export function BroadcastForm({ staff }: { staff: any[] }) {
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState("all");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await sendBroadcast(new FormData(e.currentTarget));
      if (r?.error) { alert(r.error); return; }
      alert(`Alert sent to ${r.count} ${r.count === 1 ? "person" : "people"}.`);
      (e.target as HTMLFormElement).reset();
      setTarget("all");
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-lg space-y-3 p-5">
      <div>
        <label className="label">Send to</label>
        <div className="mb-2 flex gap-2">
          <button type="button" onClick={() => setTarget("all")}
            className={`flex-1 ${target === "all" ? "btn-primary" : "btn-secondary"}`}><Users size={15} /> Everyone</button>
          <button type="button" onClick={() => setTarget(staff[0]?.id ?? "all")}
            className={`flex-1 ${target !== "all" ? "btn-primary" : "btn-secondary"}`}><User size={15} /> One person</button>
        </div>
        {target !== "all" && (
          <select name="target" className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.employee_code})</option>)}
          </select>
        )}
        {target === "all" && <input type="hidden" name="target" value="all" />}
      </div>
      <div><label className="label">Message title *</label><input name="title" className="input" placeholder="Urgent: spill in dog aisle — clean now" required /></div>
      <div><label className="label">Details (optional)</label><textarea name="body" rows={3} className="input" placeholder="Add any detail…" /></div>
      <button className="btn-primary w-full" disabled={busy}><Send size={15} /> {busy ? "Sending…" : "Send alert"}</button>
      <p className="text-xs text-slate-400">Recipients see it instantly in their notification bell.</p>
    </form>
  );
}
