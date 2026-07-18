"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCashReport } from "./actions";

export function DeleteReportButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function remove(fd: FormData) {
    if (!confirm("Delete this cashier log?")) return;
    start(async () => {
      const result = await deleteCashReport(fd);
      if (result?.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={remove} className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="label">Admin password</label>
        <input name="admin_password" type="password" className="input !w-56" placeholder="Required to delete" required />
      </div>
      <button className="btn-secondary text-red-600" disabled={pending}>
        <Trash2 size={15} /> {pending ? "Deleting..." : "Delete test log"}
      </button>
    </form>
  );
}
