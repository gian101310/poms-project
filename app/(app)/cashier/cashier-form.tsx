"use client";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitCashReport } from "./actions";
import { Save } from "lucide-react";

export function CashierForm({ today }: { today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    start(async () => {
      const result = await submitCashReport(fd);
      if (result?.error) {
        alert(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={submit} className="card mb-6 space-y-4 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="label">Date</label>
          <input name="report_date" type="date" defaultValue={today} className="input" required />
        </div>
        <div>
          <label className="label">Phase</label>
          <select name="phase" className="input" defaultValue="opening" required>
            <option value="opening">Opening</option>
            <option value="shift_change">Shift change</option>
            <option value="closing">Closing</option>
          </select>
        </div>
        <div>
          <label className="label">Opening float</label>
          <input name="opening_float" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div>
          <label className="label">Closing float</label>
          <input name="closing_float" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
        <div>
          <label className="label">Cash drop</label>
          <input name="cash_sales" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
        <div>
          <label className="label">Card sales</label>
          <input name="card_sales" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
        <div>
          <label className="label">Tips</label>
          <input name="tips" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
        <div>
          <label className="label">Expenses</label>
          <input name="expenses" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="label">Expense notes</label>
          <textarea name="expense_notes" className="input" rows={2} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea name="notes" className="input" rows={2} />
        </div>
      </div>

      <button className="btn-primary" disabled={pending}>
        <Save size={16} /> {pending ? "Saving..." : "Submit cash report"}
      </button>
    </form>
  );
}
