"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PawPrint } from "lucide-react";

function getPosition(timeoutMs = 12000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") === "disabled" ? "Your account is disabled. Contact your manager." : null
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const email = `${code.trim().toUpperCase()}@poms.local`;
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err || !data.user) {
      setError("Invalid Employee ID or password.");
      setLoading(false);
      return;
    }

    // Record login session (append-only history)
    let sessionId: string | null = null;
    try {
      const ua = navigator.userAgent;
      const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Other";
      const device = /Mobi|Android/i.test(ua) ? "Mobile" : /Tablet|iPad/i.test(ua) ? "Tablet" : "Desktop";
      const { data: sess } = await supabase
        .from("login_sessions")
        .insert({ profile_id: data.user.id, device, browser })
        .select("id")
        .single();
      if (sess) {
        sessionId = sess.id;
        localStorage.setItem("poms_session_id", sess.id);
      }
    } catch { /* non-blocking */ }

    // Geofence check (server decides; exempt roles skip, "off" mode skips)
    try {
      setStatus("Checking location…");
      const coords = await getPosition();
      const res = await fetch("/api/auth/geocheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(coords ?? {}), session_id: sessionId }),
      });
      const verdict = await res.json();
      if (!verdict.allowed) {
        localStorage.removeItem("poms_session_id");
        setError(verdict.reason ?? "Login is only allowed at the store.");
        setStatus(null);
        setLoading(false);
        return;
      }
    } catch { /* geocheck unavailable → allow (fails open to avoid lockout) */ }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <PawPrint size={26} />
          </div>
          <h1 className="text-xl font-bold">POMS</h1>
          <p className="text-sm text-slate-500">Pet Store Operations Management</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Employee ID</label>
            <input className="input" placeholder="EMP0001" value={code}
              onChange={(e) => setCode(e.target.value)} autoFocus required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? (status ?? "Signing in…") : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Forgot your password? Ask your manager to reset it.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
