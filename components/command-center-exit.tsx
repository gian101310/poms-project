"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function CommandCenterExit({ className = "btn-secondary" }: { className?: string }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") router.push("/overview");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <Link href="/overview" className={className} title="Back to Command Center (Esc)">
      <LogOut size={15} /> Exit
    </Link>
  );
}
