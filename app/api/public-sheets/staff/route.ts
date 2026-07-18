import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const { data: store, error: storeError } = await admin.from("stores")
    .select("id")
    .eq("code", "SPRINGS")
    .single();
  if (storeError || !store) return NextResponse.json({ error: "Springs branch not found." }, { status: 500 });

  const { data, error } = await admin.from("profiles")
    .select("id, full_name, employee_code")
    .eq("store_id", store.id)
    .eq("status", "active")
    .neq("role", "super_admin")
    .neq("employee_code", "BOSSG")
    .order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ staff: data ?? [] });
}
