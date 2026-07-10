// Store timezone helpers. Default store runs on Asia/Dubai.
export const STORE_TZ = "Asia/Dubai";

/** YYYY-MM-DD for "today" in the store timezone */
export function todayStr(tz: string = STORE_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/** HH:MM current time in store timezone */
export function nowTimeStr(tz: string = STORE_TZ): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
}

export function fmtDateTime(iso: string | null | undefined, tz: string = STORE_TZ): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d + (d.length === 10 ? "T00:00:00" : ""));
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function fmtTime(iso: string | null | undefined, tz: string = STORE_TZ): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}

/** minutes between two HH:MM[:SS] strings (b - a) */
export function minutesBetween(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}

/** day of week (0=Sun..6=Sat) of a YYYY-MM-DD */
export function dow(dateStr: string): number {
  return new Date(dateStr + "T12:00:00Z").getUTCDay();
}

/** days since epoch of a YYYY-MM-DD */
export function epochDays(dateStr: string): number {
  return Math.floor(new Date(dateStr + "T00:00:00Z").getTime() / 86400000);
}
