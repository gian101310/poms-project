"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ClipboardCheck, CheckCheck, ArrowLeftRight, HeartPulse,
  AlertTriangle, FileText, Search as SearchIcon, ClipboardList, CalendarClock,
  Users, Building2, Clock3, ListChecks, Bell, Moon, Sun, LogOut,
  PawPrint, Menu, X, History, CalendarDays, BarChart3, Settings, QrCode, Send,
  WalletCards, UserCog,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: any };

const staffNav: NavItem[] = [
  { href: "/dashboard", label: "My Day", icon: LayoutDashboard },
  { href: "/checklist", label: "My Checklist", icon: ClipboardCheck },
  { href: "/handover", label: "Shift Handover", icon: ArrowLeftRight },
  { href: "/animals", label: "Animal Welfare", icon: HeartPulse },
  { href: "/boarding", label: "Boarding & Kennel", icon: PawPrint },
  { href: "/cashier", label: "Cashier Report", icon: WalletCards },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/memos", label: "Memos", icon: FileText },
  { href: "/attendance", label: "My Attendance", icon: CalendarClock },
  { href: "/leave", label: "Leave", icon: CalendarDays },
  { href: "/performance", label: "My Performance", icon: BarChart3 },
  { href: "/account", label: "My Account", icon: UserCog },
];

const supervisorExtra: NavItem[] = [
  { href: "/verify", label: "Verify Tasks", icon: CheckCheck },
  { href: "/inspections", label: "Inspections", icon: ClipboardList },
];

const managerExtra: NavItem[] = [
  { href: "/overview", label: "Command Center", icon: LayoutDashboard },
  { href: "/broadcast", label: "Send Alert", icon: Send },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reports", label: "Daily Reports", icon: FileText },
  { href: "/qr", label: "Shop QR", icon: QrCode },
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/audit", label: "Audit Trail", icon: History },
];

const adminExtra: NavItem[] = [
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/shifts", label: "Shifts & Schedules", icon: Clock3 },
  { href: "/admin/templates", label: "Checklist Templates", icon: ListChecks },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Shell({
  role, name, code, unread, children,
}: {
  role: string; name: string; code: string; unread: number; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    // login-session heartbeat every 5 minutes
    const iv = setInterval(async () => {
      const id = localStorage.getItem("poms_session_id");
      if (!id) return;
      try {
        const supabase = createClient();
        await supabase.from("login_sessions").update({ last_activity_at: new Date().toISOString() }).eq("id", id);
      } catch { }
    }, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  function toggleTheme() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    localStorage.theme = next ? "dark" : "light";
    setDark(next);
  }

  async function logout() {
    const supabase = createClient();
    const id = localStorage.getItem("poms_session_id");
    if (id) {
      try {
        await supabase.from("login_sessions").update({
          logout_at: new Date().toISOString(), closed_by: "user",
        }).eq("id", id);
      } catch { }
      localStorage.removeItem("poms_session_id");
      document.cookie = "poms_session_id=; path=/; max-age=0; samesite=lax";
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  let nav = [...staffNav];
  if (["supervisor", "manager", "super_admin"].includes(role)) nav = [...nav, ...supervisorExtra];
  if (["manager", "super_admin"].includes(role)) nav = [...nav, ...managerExtra];
  if (role === "super_admin") nav = [...nav, ...adminExtra];

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <PawPrint size={20} />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">POMS</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Pet Store Ops</p>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${active
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="text-xs capitalize text-slate-400">{code} · {role.replace("_", " ")}</p>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
        {sidebar}
      </aside>
      {/* mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-900">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <button className="btn-secondary !px-2 md:hidden" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="btn-secondary relative !px-2">
              <Bell size={17} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <button className="btn-secondary !px-2" onClick={toggleTheme}>
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="btn-secondary !px-2" onClick={logout} title="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
