import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/tz";
import { MarkAllRead, NotifRow } from "./notif-actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const { data: notifs } = await supabase.from("notifications")
    .select("*").eq("recipient_id", profile.id)
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div>
      <PageHeader title="Notifications" action={<MarkAllRead />} />
      {(!notifs || notifs.length === 0) ? (
        <EmptyState message="No notifications." />
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {notifs.map((n: any) => (
            <NotifRow key={n.id} notif={n} time={fmtDateTime(n.created_at)} />
          ))}
        </div>
      )}
    </div>
  );
}
