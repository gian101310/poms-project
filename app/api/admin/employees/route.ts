import { NextResponse } from "next/server";
import { getProfile } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin-only employee lifecycle: create account, reset password, enable/disable.
// Uses the service role — signups are disabled publicly.

export async function POST(req: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "super_admin" || profile.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  let admin;
  try { admin = createAdminClient(); } catch (e: any) {
    return NextResponse.json({ error: "Service role key not configured on the server." }, { status: 500 });
  }

  try {
    if (body.action === "create") {
      const code = String(body.employee_code ?? "").trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
        return NextResponse.json({ error: "Employee ID must be 3–20 letters/numbers." }, { status: 400 });
      }
      if (String(body.password ?? "").length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }

      const { data: created, error: authErr } = await admin.auth.admin.createUser({
        email: `${code}@poms.local`,
        password: body.password,
        email_confirm: true,
      });
      if (authErr || !created.user) {
        return NextResponse.json({ error: authErr?.message ?? "Auth user creation failed" }, { status: 400 });
      }

      const { error: profErr } = await admin.from("profiles").insert({
        id: created.user.id,
        store_id: profile.store_id,
        employee_code: code,
        full_name: body.full_name,
        role: body.role ?? "staff",
        position_id: body.position_id,
        phone: body.phone,
        email: body.email,
        date_hired: body.date_hired,
        emergency_contact: body.emergency_contact ?? {},
      });
      if (profErr) {
        await admin.auth.admin.deleteUser(created.user.id); // rollback orphan auth user
        return NextResponse.json({ error: profErr.message }, { status: 400 });
      }

      const deptIds: string[] = body.department_ids ?? [];
      const supIds: string[] = body.is_supervisor_of ?? [];
      const assignments = Array.from(new Set([...deptIds, ...supIds])).map((d) => ({
        profile_id: created.user!.id,
        department_id: d,
        is_primary_supervisor: supIds.includes(d),
      }));
      if (assignments.length) await admin.from("department_assignments").insert(assignments);

      return NextResponse.json({ ok: true, id: created.user.id });
    }

    if (body.action === "reset_password") {
      if (String(body.password ?? "").length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }
      const { error } = await admin.auth.admin.updateUserById(body.profile_id, { password: body.password });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "set_status") {
      const status = body.status === "active" ? "active" : body.status === "resigned" ? "resigned" : "suspended";
      const { error } = await admin.from("profiles").update({ status }).eq("id", body.profile_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      // Ban/unban at the auth layer too
      await admin.auth.admin.updateUserById(body.profile_id, {
        ban_duration: status === "active" ? "none" : "876000h",
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 });
  }
}
