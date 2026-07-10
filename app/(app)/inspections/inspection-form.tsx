"use client";
import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createInspection } from "./actions";
import { Plus, Trash2 } from "lucide-react";

const DEFAULT_CRITERIA = ["Cleanliness", "Animal condition", "Stock levels", "Equipment", "Safety compliance"];
const TYPES = ["opening", "mid_shift", "closing", "random"];

type Item = { criterion: string; max_score: number; score: number; remark: string };

export function InspectionForm({ departments }: { departments: any[] }) {
  const [type, setType] = useState("opening");
  const [dept, setDept] = useState(departments[0]?.id ?? "");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<Item[]>(
    DEFAULT_CRITERIA.map((c) => ({ criterion: c, max_score: 10, score: 10, remark: "" }))
  );
  const [pending, start] = useTransition();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);

  function pos(e: any) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  }
  function startDraw(e: any) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
  }
  function draw(e: any) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 2; ctx.lineCap = "round";
    const { x, y } = pos(e);
    ctx.lineTo(x, y); ctx.stroke();
    setSigned(true);
  }
  function clearSig() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setSigned(false);
  }

  function submit() {
    start(async () => {
      const signature = signed ? canvasRef.current!.toDataURL("image/png") : null;
      const r = await createInspection({ inspection_type: type, department_id: dept, remarks, items, signature });
      if (r?.error) alert(r.error); else router.push("/inspections");
      router.refresh();
    });
  }

  return (
    <div className="card max-w-3xl space-y-4 p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Inspection Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Department</label>
          <select className="input" value={dept} onChange={(e) => setDept(e.target.value)}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="label !mb-0">Scored Criteria</label>
          <button className="btn-secondary !py-1" onClick={() =>
            setItems([...items, { criterion: "", max_score: 10, score: 10, remark: "" }])}>
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <input className="input !w-48" placeholder="Criterion" value={it.criterion}
                onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, criterion: e.target.value } : x))} />
              <input className="input !w-20" type="number" min={0} max={it.max_score} value={it.score}
                onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, score: Number(e.target.value) } : x))} />
              <span className="text-sm text-slate-400">/ {it.max_score}</span>
              <input className="input flex-1" placeholder="Remark" value={it.remark}
                onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, remark: e.target.value } : x))} />
              <button className="btn-secondary !px-2 !py-1.5" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold">
          Total: {items.reduce((s, i) => s + i.score, 0)} / {items.reduce((s, i) => s + i.max_score, 0)}
        </p>
      </div>

      <div><label className="label">Overall Remarks</label><textarea className="input" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="label !mb-0">Digital Signature</label>
          <button className="btn-secondary !py-1" onClick={clearSig}>Clear</button>
        </div>
        <canvas ref={canvasRef} width={400} height={120}
          className="w-full max-w-md touch-none rounded-lg border border-dashed border-slate-300 bg-white dark:border-slate-700"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => (drawing.current = false)}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => (drawing.current = false)} />
      </div>

      <button className="btn-primary" disabled={pending || items.some((i) => !i.criterion)}
        onClick={submit}>{pending ? "Submitting…" : "Submit Inspection"}</button>
    </div>
  );
}
