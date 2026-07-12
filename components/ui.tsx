import React from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const badgeColors: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  started: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  completed: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  verified: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  open: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  investigating: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  present: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  late: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  absent: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  on_leave: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  holiday: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  resigned: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  issued: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  acknowledged: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  responded: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  normal: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  low: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  opening: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  shift_change: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  closing: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function Badge({ value }: { value: string }) {
  const cls = badgeColors[value] ?? badgeColors.normal;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card flex items-center justify-center p-10 text-sm text-slate-400">{message}</div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr>{headers.map((h) => <th key={h} className="th">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** simple horizontal bar for analytics */
export function Bar({ pct, color = "bg-brand-500" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}
