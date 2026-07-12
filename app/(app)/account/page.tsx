import { requireProfile } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await requireProfile();

  return (
    <div>
      <PageHeader title="My Account" subtitle={`${profile.full_name} · ${profile.employee_code}`} />
      <PasswordForm />
    </div>
  );
}
