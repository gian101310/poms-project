import { getPortalName } from "@/lib/settings";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const portalName = await getPortalName();
  return <LoginForm portalName={portalName} />;
}
