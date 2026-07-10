"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueMemo } from "./actions";

export function MemoForm({ employees }: { employees: any[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form className="card max-w-2xl space-y-3 p-5"
      action={(fd) => start(async () => {
        const r = await issueMemo(fd);
        if (r?.error) alert(r.error); else router.push("/memos");
        router.refresh();
      })}>
      <div>
        <label className="label">Employee *</label>
        <select name="issued_to" className="input" required>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
        </select>
      </div>
      <div><label className="label">Reason *</label><input name="reason" className="input" required /></div>
      <div><label className="label">Details</label><textarea name="body" className="input" rows={5} /></div>
      <button className="btn-primary" disabled={pending}>{pending ? "Issuing…" : "Issue Memo"}</button>
      <p className="text-xs text-slate-400">The employee must acknowledge within 48 hours. Unacknowledged memos are escalated.</p>
    </form>
  );
}
