"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSetting } from "./actions";
import { Save } from "lucide-react";

export function SettingRow({ setting, description }: { setting: any; description?: string }) {
  const [value, setValue] = useState(JSON.stringify(setting.value));
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = value !== JSON.stringify(setting.value);

  return (
    <tr className="table-row">
      <td className="td text-sm">{setting.stores?.name ?? "Global"}</td>
      <td className="td">
        <p className="font-mono text-xs font-semibold">{setting.key}</p>
        {description && <p className="mt-0.5 max-w-sm text-xs text-slate-400">{description}</p>}
      </td>
      <td className="td">
        <input className="input font-mono !text-xs" value={value} onChange={(e) => setValue(e.target.value)} />
      </td>
      <td className="td">
        <button className="btn-primary !px-2 !py-1" disabled={pending || !dirty}
          onClick={() => start(async () => {
            const r = await updateSetting(setting.id, value);
            if (r?.error) alert(r.error);
            router.refresh();
          })}>
          <Save size={13} />
        </button>
      </td>
    </tr>
  );
}
