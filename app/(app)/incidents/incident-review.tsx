"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewIncident } from "./actions";

export function IncidentReview({ id, status, isManager }: { id: string; status: string; isManager: boolean }) {
  const [comments, setComments] = useState("");
  const [decision, setDecision] = useState("");
  const [next, setNext] = useState(status === "open" ? "investigating" : "resolved");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="card mt-4 space-y-3 p-5">
      <h3 className="font-semibold">Review</h3>
      <div>
        <label className="label">Supervisor Comments</label>
        <textarea className="input" rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
      </div>
      {isManager && (
        <div>
          <label className="label">Management Decision</label>
          <textarea className="input" rows={2} value={decision} onChange={(e) => setDecision(e.target.value)} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <select className="input !w-auto" value={next} onChange={(e) => setNext(e.target.value)}>
          {["investigating", "resolved", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-primary" disabled={pending}
          onClick={() => start(async () => {
            const r = await reviewIncident(id, next, comments, decision);
            if (r?.error) alert(r.error);
            router.refresh();
          })}>
          Update Incident
        </button>
      </div>
    </div>
  );
}
