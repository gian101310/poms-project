"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitCashReport } from "./actions";
import { Calculator, Save } from "lucide-react";

const expenseVendors = ["Carrefour", "Borders", "Daiso", "Custom"];

function amount(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value: number) {
  return `AED ${value.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function phaseText(phase: "opening" | "shift_change" | "closing") {
  if (phase === "shift_change") return "Shift change";
  if (phase === "closing") return "Closing";
  return "Opening";
}

export function CashierForm({
  today,
  storeId,
  standardFloat,
  staff,
  groomers,
}: {
  today: string;
  storeId: string;
  standardFloat?: number | null;
  staff: any[];
  groomers: any[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState<"opening" | "shift_change" | "closing">("opening");
  const [openingFloat, setOpeningFloat] = useState("");
  const [closingFloat, setClosingFloat] = useState("");
  const [hikeCash, setHikeCash] = useState("");
  const [hikeCard, setHikeCard] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [actualCard, setActualCard] = useState("");
  const [cardTips, setCardTips] = useState("");
  const [expenses, setExpenses] = useState("");
  const [expenseVendor, setExpenseVendor] = useState("Carrefour");

  const calc = useMemo(() => {
    const tip = amount(cardTips);
    const exp = amount(expenses);
    const expectedCashAfterPayouts = amount(hikeCash) - tip - exp;
    const expectedCardWithTips = amount(hikeCard) + tip;
    const cashVariance = amount(actualCash) - expectedCashAfterPayouts;
    const cardVariance = amount(actualCard) - expectedCardWithTips;
    const totalVariance = cashVariance + cardVariance;
    const activeFloat = phase === "closing" ? amount(closingFloat) : amount(openingFloat);
    const standardVariance = standardFloat == null ? 0 : activeFloat - standardFloat;
    const floatVariance = standardFloat == null
      ? (phase !== "opening" && openingFloat && closingFloat ? amount(closingFloat) - amount(openingFloat) : 0)
      : standardVariance;
    return { expectedCashAfterPayouts, expectedCardWithTips, cashVariance, cardVariance, totalVariance, floatVariance, standardVariance };
  }, [actualCard, actualCash, cardTips, closingFloat, expenses, hikeCard, hikeCash, openingFloat, phase, standardFloat]);

  function submit(fd: FormData) {
    fd.set("store_id", storeId);
    fd.set("opening_float", phase === "closing" ? "" : openingFloat);
    fd.set("closing_float", phase === "opening" ? "" : closingFloat);
    fd.set("cash_sales", actualCash);
    fd.set("card_sales", actualCard);
    fd.set("expected_cash", hikeCash);
    fd.set("counted_cash", actualCash);
    fd.set("expected_card", hikeCard);
    fd.set("actual_card", actualCard);
    fd.set("tips", cardTips);
    fd.set("card_tip_amount", cardTips);
    fd.set("expenses", expenses);
    fd.set("shop_purchase_amount", expenses);
    fd.set("missing_amount", String(calc.cashVariance.toFixed(2)));
    fd.set("card_variance", String(calc.cardVariance.toFixed(2)));
    fd.set("received_correct", Math.abs(calc.totalVariance) < 0.01 ? "yes" : "no");
    start(async () => {
      const result = await submitCashReport(fd);
      if (result?.error) {
        alert(result.error);
        return;
      }
      formRef.current?.reset();
      setPhase("opening");
      setOpeningFloat("");
      setClosingFloat("");
      setHikeCash("");
      setHikeCard("");
      setActualCash("");
      setActualCard("");
      setCardTips("");
      setExpenses("");
      setExpenseVendor("Carrefour");
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={submit} className="card mb-6 space-y-4 p-4">
      <input type="hidden" name="store_id" value={storeId} />
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Cash float</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {phase !== "closing" && (
            <div>
              <label className="label">{phase === "shift_change" ? "Actual shift float received" : "Actual opening float received"}</label>
              <input value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} type="number" min="0" step="0.01" className="input" placeholder="AED" />
              <p className="mt-1 text-xs text-slate-500">Count the real cash float received.</p>
            </div>
          )}
          <div>
            <label className="label">Standard float</label>
            <div className="input flex items-center bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {standardFloat == null ? "Not set in Command Center" : money(standardFloat)}
            </div>
            <p className={Math.abs(calc.standardVariance) < 0.01 ? "mt-1 text-xs text-green-600" : "mt-1 text-xs text-red-600"}>
              {standardFloat == null ? "Set this per branch on Command Center." : `Difference: ${money(calc.standardVariance)}`}
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="label">Date</label>
          <input name="report_date" type="date" defaultValue={today} className="input" required />
        </div>
        <div>
          <label className="label">Phase</label>
          <select name="phase" className="input" value={phase} onChange={(e) => setPhase(e.target.value as typeof phase)} required>
            <option value="opening">Opening</option>
            <option value="shift_change">Shift change</option>
            <option value="closing">Closing</option>
          </select>
        </div>
        <div>
          <label className="label">Opened / closed by</label>
          <select name="submitted_by" className="input" defaultValue="" required>
            <option value="">Choose staff</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.employee_code})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Handover to</label>
          <select name="turnover_to" className="input" defaultValue="">
            <option value="">No handover</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.employee_code})</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{phaseText(phase)} Hike sales</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="label">{phaseText(phase)} Hike cash sales</label>
            <input value={hikeCash} onChange={(e) => setHikeCash(e.target.value)} type="number" min="0" step="0.01" className="input" placeholder="AED" />
          </div>
          <div>
            <label className="label">{phaseText(phase)} Hike card sales</label>
            <input value={hikeCard} onChange={(e) => setHikeCard(e.target.value)} type="number" min="0" step="0.01" className="input" placeholder="AED" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{phase === "closing" ? "Closing count" : phase === "shift_change" ? "Shift count" : "Actual count"}</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="label">{phaseText(phase)} actual card machine sales</label>
            <input value={actualCard} onChange={(e) => setActualCard(e.target.value)} type="number" min="0" step="0.01" className="input" placeholder="AED" />
          </div>
          <div>
            <label className="label">{phaseText(phase)} actual cash / money drop</label>
            <input value={actualCash} onChange={(e) => setActualCash(e.target.value)} type="number" min="0" step="0.01" className="input" placeholder="AED" />
          </div>
          {phase !== "opening" && (
            <div>
              <label className="label">{phase === "shift_change" ? "Shift float" : "Closing float"}</label>
              <input value={closingFloat} onChange={(e) => setClosingFloat(e.target.value)} type="number" min="0" step="0.01" className="input" placeholder="AED" />
              <p className={standardFloat != null && Math.abs(amount(closingFloat) - standardFloat) >= 0.01 ? "mt-1 text-xs text-red-600" : "mt-1 text-xs text-slate-500"}>
                {standardFloat == null
                  ? "Set the standard float in Command Center."
                  : `Must match standard float ${money(standardFloat)}.`}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="label">Card tips amount</label>
          <input value={cardTips} onChange={(e) => setCardTips(e.target.value)} type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
        <div>
          <label className="label">Tip for groomer</label>
          <select name="card_tip_groomer" className="input" defaultValue="">
            <option value="">Choose groomer</option>
            {groomers.map((g) => <option key={g.id} value={g.full_name}>{g.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Expenses amount</label>
          <input value={expenses} onChange={(e) => setExpenses(e.target.value)} type="number" min="0" step="0.01" className="input" placeholder="AED" />
        </div>
        <div>
          <label className="label">Expense shop</label>
          <select name="expense_vendor" className="input" value={expenseVendor} onChange={(e) => setExpenseVendor(e.target.value)}>
            {expenseVendors.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Custom shop name</label>
          <input name="expense_vendor_custom" className="input" placeholder="Only if Custom" disabled={expenseVendor !== "Custom"} />
        </div>
        <div>
          <label className="label">Expense reason</label>
          <input name="expense_reason" className="input" placeholder="What was bought / why" />
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-4">
        <div className="flex items-center gap-2 md:col-span-4">
          <Calculator size={16} className="text-slate-400" />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Auto calculation</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Expected cash after payouts</p>
          <p className="font-semibold">{money(calc.expectedCashAfterPayouts)}</p>
          <p className="text-[11px] text-slate-400">Hike cash minus card tips and expenses.</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Expected card with tips</p>
          <p className="font-semibold">{money(calc.expectedCardWithTips)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">{phaseText(phase)} cash variance</p>
          <p className={Math.abs(calc.cashVariance) < 0.01 ? "font-semibold text-green-600" : "font-semibold text-amber-600"}>{money(calc.cashVariance)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">{phaseText(phase)} card variance</p>
          <p className={Math.abs(calc.cardVariance) < 0.01 ? "font-semibold text-green-600" : "font-semibold text-amber-600"}>{money(calc.cardVariance)}</p>
        </div>
        {phase !== "opening" && (
          <div>
            <p className="text-xs text-slate-400">{phase === "shift_change" ? "Shift float variance" : "Closing float variance"}</p>
            <p className={Math.abs(calc.floatVariance) < 0.01 ? "font-semibold text-green-600" : "font-semibold text-red-600"}>{money(calc.floatVariance)}</p>
            <p className="text-[11px] text-slate-400">{standardFloat == null ? "Against opening float when entered." : "Against standard float."}</p>
          </div>
        )}
        {standardFloat != null && (
          <div>
            <p className="text-xs text-slate-400">Standard float variance</p>
            <p className={Math.abs(calc.standardVariance) < 0.01 ? "font-semibold text-green-600" : "font-semibold text-red-600"}>{money(calc.standardVariance)}</p>
          </div>
        )}
        <div className="md:col-span-4">
          <p className="text-xs text-slate-400">Total variance</p>
          <p className={Math.abs(calc.totalVariance) < 0.01 ? "text-lg font-bold text-green-600" : "text-lg font-bold text-red-600"}>{money(calc.totalVariance)}</p>
        </div>
      </div>

      <div>
        <label className="label">Notes / reason if not balanced</label>
        <textarea name="notes" className="input" rows={2} placeholder="Add reason if variance is not zero." />
      </div>

      <input type="hidden" name="cash_sales" />
      <input type="hidden" name="card_sales" />
      <input type="hidden" name="tips" />
      <input type="hidden" name="expenses" />
      <input type="hidden" name="opening_float" />
      <input type="hidden" name="closing_float" />
      <input type="hidden" name="expected_cash" />
      <input type="hidden" name="counted_cash" />
      <input type="hidden" name="missing_amount" />
      <input type="hidden" name="expected_card" />
      <input type="hidden" name="actual_card" />
      <input type="hidden" name="card_variance" />
      <input type="hidden" name="card_tip_amount" />
      <input type="hidden" name="shop_purchase_amount" />
      <input type="hidden" name="received_correct" />

      <button className="btn-primary" disabled={pending}>
        <Save size={16} /> {pending ? "Saving..." : "Submit cash report"}
      </button>
    </form>
  );
}
