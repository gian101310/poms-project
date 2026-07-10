"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeMemo, respondMemo, decideMemo } from "./actions";

export function MemoActions({ memo, isRecipient, isManager }: any) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (fn: () => Promise<any>) =>
    start(async () => { const r = await fn(); if (r?.error) alert(r.error); setText(""); router.refresh(); });

  if (memo.status === "closed") return null;

  return (
    <div className="card mt-4 space-y-3 p-5">
      {isRecipient && !memo.acknowledged_at && (
        <button className="btn-primary" disabled={pending} onClick={() => act(() => acknowledgeMemo(memo.id))}>
          Acknowledge Receipt
        </button>
      )}
      {isRecipient && memo.acknowledged_at && !memo.employee_response && (
        <div>
          <label className="label">Your Response</label>
          <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary mt-2" disabled={pending || !text}
            onClick={() => act(() => respondMemo(memo.id, text))}>Submit Response</button>
        </div>
      )}
      {isManager && memo.status !== "issued" && !memo.manager_decision && (
        <div>
          <label className="label">Manager Decision (closes the memo)</label>
          <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary mt-2" disabled={pending || !text}
            onClick={() => act(() => decideMemo(memo.id, text))}>Record Decision & Close</button>
        </div>
      )}
    </div>
  );
}
