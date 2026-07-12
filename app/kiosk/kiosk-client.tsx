"use client";
import { useEffect, useState } from "react";

type QrState = {
  label: string;
  purpose: "login" | "break";
  dataUrl: string;
  expiresAt: string;
};

export function KioskClient({ kioskKey }: { kioskKey: string }) {
  const [qr, setQr] = useState<QrState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/kiosk/qr?key=${encodeURIComponent(kioskKey)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load QR.");
        if (!cancelled) {
          setQr(json);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Could not load QR.");
      }
    }
    load();
    const iv = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [kioskKey]);

  const seconds = qr ? Math.max(0, Math.round((new Date(qr.expiresAt).getTime() - Date.now()) / 1000)) : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold">{qr?.label ?? "Shop QR"}</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {qr ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.dataUrl} alt={qr.label} className="w-full max-w-md rounded-2xl bg-white p-3 shadow-lg" />
          <p className="text-sm text-slate-500">
            {qr.purpose === "break" ? "Use this for Start Break / End Break." : "Scan to log in inside the shop."}
          </p>
          <p className="text-xs text-slate-400">One-time code · refreshes automatically · expires in about {seconds}s</p>
        </>
      ) : (
        <div className="card p-8 text-sm text-slate-500">Loading QR...</div>
      )}
    </div>
  );
}
