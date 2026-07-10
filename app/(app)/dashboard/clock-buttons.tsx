"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockIn, clockOut } from "./actions";
import { LogIn, LogOut } from "lucide-react";

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

export function ClockButtons({ clockedIn, clockedOut }: { clockedIn: boolean; clockedOut: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const act = (fn: (c: any) => Promise<any>) =>
    start(async () => {
      const coords = await getPosition();
      const r: any = await fn(coords);
      if (r?.error) alert(r.error);
      else if (r?.warning) alert(r.warning);
      router.refresh();
    });

  if (clockedOut) return <span className="text-sm text-slate-400">Shift finished</span>;

  return clockedIn ? (
    <button className="btn-secondary" disabled={pending} onClick={() => act(clockOut)}>
      <LogOut size={16} /> {pending ? "…" : "Clock Out"}
    </button>
  ) : (
    <button className="btn-primary" disabled={pending} onClick={() => act(clockIn)}>
      <LogIn size={16} /> {pending ? "…" : "Clock In"}
    </button>
  );
}
