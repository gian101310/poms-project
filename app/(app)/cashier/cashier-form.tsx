"use client";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitCashReport } from "./actions";
import { Save } from "lucide-react";

export function CashierForm({ today, staff }: { today: string; staff: any[] }) {
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="label">Turnover to</label>
          <select name="turnover_to" className="input" defaultValue="">
            <option value="">No handover</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.employee_code})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Received correct amount?</label>
          <select name="received_correct" className="input" defaultValue="">
            <option value="">Not applicable</option>
            <option value="yes">Yes, correct</option>
            <option value="no">No, difference found</option>
          </select>
        </div>
        <div>
          <label className="label">Missing / over amount</label>
          <input name="missing_amount" type="number" step="0.01" className="input" placeholder="AED, use - for over" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div>
          <label className="label">Expected cash</label>
          <input name="expected_cash" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
        <div>
          <label className="label">Counted cash</label>
          <input name="counted_cash" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div>
          <label className="label">Expected card</label>
          <input name="expected_card" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
        <div>
          <label className="label">Actual card</label>
          <input name="actual_card" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
        <div>
          <label className="label">Card variance</label>
          <input name="card_variance" type="number" step="0.01" className="input" placeholder="AED, use - if short" />
        </div>
        <div>
          <label className="label">Card tips</label>
          <input name="card_tip_amount" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
        <div>
          <label className="label">Shop purchase</label>
          <input name="shop_purchase_amount" type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="label">Variance reason</label>
          <textarea name="variance_reason" className="input" rows={2} placeholder="Example: customer paid tip by card, staff bought shop item, terminal batch mismatch..." />
        </div>
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
