"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Play, Square } from "lucide-react";
import { startBreak, endBreak } from "./actions";

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

export function BreakClient({ qr, isOnBreak, startedAt }: { qr: string; isOnBreak: boolean; startedAt?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function act(kind: "start" | "end") {
    const message = kind === "start" ? "Start break now?" : "End break and return to work?";
    if (!confirm(message)) return;
    start(async () => {
      const coords = await getPosition();
      const result = kind === "start" ? await startBreak(qr, coords) : await endBreak(qr, coords);
      if (result?.error) alert(result.error);
      else if (kind === "end") {
        const duration = "duration" in result ? result.duration : null;
        alert(`Break ended${duration != null ? `: ${duration} min` : ""}.`);
      }
      router.refresh();
    });
  }

  return (
    <div className="card mx-auto max-w-md space-y-4 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
        <Coffee size={24} />
      </div>
      <div>
        <h1 className="text-xl font-bold">{isOnBreak ? "You are on break" : "Break Time"}</h1>
        {startedAt && <p className="text-sm text-slate-500">Started {new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
      </div>
      {isOnBreak ? (
        <button className="btn-primary w-full" disabled={pending} onClick={() => act("end")}>
          <Square size={16} /> {pending ? "Saving..." : "End Break"}
        </button>
      ) : (
        <button className="btn-primary w-full" disabled={pending} onClick={() => act("start")}>
          <Play size={16} /> {pending ? "Saving..." : "Start Break"}
        </button>
      )}
      <p className="text-xs text-slate-400">This action uses one-time QR, location, and your active device session.</p>
    </div>
  );
}
