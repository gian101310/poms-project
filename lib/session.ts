import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "super_admin" | "manager" | "supervisor" | "staff";

export type Profile = {
  id: string;
  store_id: string;
  employee_code: string;
  full_name: string;
  photo_url: string | null;
  role: Role;
  status: string;
  email: string | null;
  phone: string | null;
  date_hired: string | null;
  position_id: string | null;
};

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const p = await getProfile();
  if (!p) redirect("/login");
  if (p.status !== "active") redirect("/login?error=disabled");
  return p;
}

export async function requireRole(roles: Role[]): Promise<Profile> {
  const p = await requireProfile();
  if (!roles.includes(p.role)) redirect("/dashboard");
  return p;
}

export const isSupervisorUp = (r: Role) => ["super_admin", "manager", "supervisor"].includes(r);
export const isManagerUp = (r: Role) => ["super_admin", "manager"].includes(r);
