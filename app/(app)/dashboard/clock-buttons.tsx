"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockIn, clockOut } from "./actions";
import { LogIn, LogOut } from "lucide-react";

export function ClockButtons({ clockedIn, clockedOut }: { clockedIn: boolean; clockedOut: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (clockedOut) return <span className="text-sm text-slate-400">Shift finished</span>;

  return clockedIn ? (
    <button className="btn-secondary" disabled={pending}
      onClick={() => start(async () => { const r = await clockOut(); if (r?.error) alert(r.error); router.refresh(); })}>
      <LogOut size={16} /> Clock Out
    </button>
  ) : (
    <button className="btn-primary" disabled={pending}
      onClick={() => start(async () => { const r = await clockIn(); if (r?.error) alert(r.error); router.refresh(); })}>
      <LogIn size={16} /> Clock In
    </button>
  );
}
