// Shared guard for cron endpoints. Vercel Cron sends Authorization: Bearer CRON_SECRET.
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
