import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// One-time bootstrap: creates the FIRST Super Admin.
// Only works while the profiles table is empty, and requires SETUP_SECRET.
// POST { secret, employee_code, full_name, password }

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!process.env.SETUP_SECRET || body.secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let admin;
  try { admin = createAdminClient(); } catch {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 500 });
  }

  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Setup already completed — profiles exist." }, { status: 409 });
  }

  const code = String(body.employee_code ?? "ADMIN001").trim().toUpperCase();
  if (String(body.password ?? "").length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const { data: store } = await admin.from("stores").select("id").limit(1).single();
  if (!store) return NextResponse.json({ error: "No store found — run migration 004 (seed) first." }, { status: 500 });

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: `${code}@poms.local`,
    password: body.password,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    return NextResponse.json({ error: authErr?.message ?? "Auth creation failed" }, { status: 400 });
  }

  const { error: profErr } = await admin.from("profiles").insert({
    id: created.user.id,
    store_id: store.id,
    employee_code: code,
    full_name: body.full_name ?? "Super Admin",
    role: "super_admin",
    date_hired: new Date().toISOString().slice(0, 10),
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: `Super Admin ${code} created. Log in at /login.` });
}
