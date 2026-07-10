"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markRead, markAllRead } from "./actions";
import { CheckCheck } from "lucide-react";

export function MarkAllRead() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button className="btn-secondary" disabled={pending}
      onClick={() => start(async () => { await markAllRead(); router.refresh(); })}>
      <CheckCheck size={15} /> Mark all read
    </button>
  );
}

export function NotifRow({ notif, time }: { notif: any; time: string }) {
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <Link href={notif.link || "#"} className={`block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!notif.read_at ? "bg-brand-50/50 dark:bg-brand-900/10" : ""}`}
      onClick={() => start(async () => { await markRead(notif.id); router.refresh(); })}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm ${!notif.read_at ? "font-semibold" : "font-medium"}`}>{notif.title}</p>
        <span className="shrink-0 text-xs text-slate-400">{time}</span>
      </div>
      {notif.body && <p className="text-xs text-slate-500">{notif.body}</p>}
    </Link>
  );
}
