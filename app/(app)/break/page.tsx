import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { BreakClient } from "./break-client";

export const dynamic = "force-dynamic";

export default async function BreakPage({ searchParams }: { searchParams: { qr?: string } }) {
  const profile = await requireProfile();
  if (["manager", "super_admin"].includes(profile.role)) redirect("/overview");
  if (!searchParams.qr) redirect("/dashboard");

  const supabase = createClient();
  const { data: openBreak } = await supabase.from("break_sessions")
    .select("id, started_at")
    .eq("profile_id", profile.id)
    .is("ended_at", null)
    .maybeSingle();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <BreakClient qr={searchParams.qr} isOnBreak={!!openBreak} startedAt={openBreak?.started_at} />
    </div>
  );
}
