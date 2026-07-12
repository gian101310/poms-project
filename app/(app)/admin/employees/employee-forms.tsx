"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, KeyRound, Power, Pencil, CalendarOff, Copy, RefreshCw, X } from "lucide-react";

function Modal({ title, open, onClose, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative max-h-[85vh] w-full max-w-lg overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn-secondary !px-2 !py-1" type="button" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

async function api(body: any) {
  const res = await fetch("/api/admin/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const core = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `${core}${symbols[bytes[0] % symbols.length]}${(bytes[1] % 9) + 1}`;
}

function PasswordReveal({ employee, password, onClose }: { employee: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Modal title="Temporary Password" open={!!password} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Give this password to {employee}. It is shown only now. They can change it from My Account after logging in.
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs uppercase tracking-wide text-slate-400">Password</p>
          <p className="mt-1 break-all font-mono text-lg font-semibold">{password}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={copy}><Copy size={16} /> {copied ? "Copied" : "Copy"}</button>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

function SectionsPicker({
  sections,
  selected,
}: {
  sections: any[];
  selected?: string[];
}) {
  const byDept = new Map<string, { name: string; items: any[] }>();
  for (const s of sections) {
    const dept = s.departments;
    const key = dept?.id ?? s.department_id;
    const entry = byDept.get(key) ?? { name: dept?.name ?? "Other", items: [] };
    entry.items.push(s);
    byDept.set(key, entry);
  }

  return (
    <div>
      <label className="label">Assigned sections</label>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
        {Array.from(byDept.values()).map((group) => (
          <div key={group.name}>
            <p className="mb-1 text-xs font-semibold text-slate-400">{group.name}</p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {group.items.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="section_ids" value={s.id} defaultChecked={selected?.includes(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-400">Pick the exact aisle/section this staff member owns. Two or three staff can share the same section.</p>
    </div>
  );
}

export function EmployeeForm({
  departments, positions, branches, sections,
}: {
  departments: any[]; positions: any[]; branches: any[]; sections: any[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState(generatePassword());
  const [reveal, setReveal] = useState<{ employee: string; password: string } | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const deptIds = fd.getAll("department_ids").map(String);
      await api({
        action: "create",
        employee_code: String(fd.get("employee_code")).trim().toUpperCase(),
        full_name: String(fd.get("full_name")),
        password,
        store_id: String(fd.get("store_id")),
        role: String(fd.get("role")),
        position_id: (fd.get("position_id") as string) || null,
        phone: (fd.get("phone") as string) || null,
        email: (fd.get("email") as string) || null,
        date_hired: (fd.get("date_hired") as string) || null,
        emergency_contact: {
          name: (fd.get("ec_name") as string) || "",
          relation: (fd.get("ec_relation") as string) || "",
          phone: (fd.get("ec_phone") as string) || "",
        },
        department_ids: deptIds,
        is_supervisor_of: fd.getAll("supervisor_of").map(String),
      });
      setReveal({ employee: String(fd.get("full_name")), password });
      setPassword(generatePassword());
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><UserPlus size={16} /> New Employee</button>
      <Modal title="Create Employee" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Employee ID *</label><input name="employee_code" className="input" placeholder="EMP0001" required /></div>
            <div><label className="label">Full Name *</label><input name="full_name" className="input" required /></div>
            <div>
              <label className="label">Branch *</label>
              <select name="store_id" className="input" required>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Password *</label>
              <div className="flex gap-1">
                <input name="password" type="text" className="input font-mono" minLength={8} value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="btn-secondary !px-2" title="Generate password" onClick={() => setPassword(generatePassword())}>
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <div>
              <label className="label">Role *</label>
              <select name="role" className="input">
                <option value="staff">Staff</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Position</label>
              <select name="position_id" className="input">
                <option value="">—</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div><label className="label">Date Hired</label><input name="date_hired" type="date" className="input" /></div>
            <div><label className="label">Phone</label><input name="phone" className="input" /></div>
            <div><label className="label">Personal Email</label><input name="email" type="email" className="input" /></div>
          </div>
          <div>
            <label className="label">Departments</label>
            <div className="grid grid-cols-2 gap-1">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="department_ids" value={d.id} /> {d.name}
                </label>
              ))}
            </div>
          </div>
          <SectionsPicker sections={sections} />
          <div>
            <label className="label">Supervisor of (if role is supervisor)</label>
            <div className="grid grid-cols-2 gap-1">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="supervisor_of" value={d.id} /> {d.name}
                </label>
              ))}
            </div>
          </div>
          <fieldset className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <legend className="px-1 text-xs font-medium text-slate-500">Emergency Contact</legend>
            <div className="grid grid-cols-3 gap-2">
              <input name="ec_name" className="input" placeholder="Name" />
              <input name="ec_relation" className="input" placeholder="Relation" />
              <input name="ec_phone" className="input" placeholder="Phone" />
            </div>
          </fieldset>
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create Employee"}</button>
        </form>
      </Modal>
      {reveal && <PasswordReveal employee={reveal.employee} password={reveal.password} onClose={() => setReveal(null)} />}
    </>
  );
}

export function EditEmployee({
  employee, departments, positions, branches, sections,
}: {
  employee: any; departments: any[]; positions: any[]; branches: any[]; sections: any[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const myDepts = (employee.department_assignments ?? []).map((a: any) => a.department_id);
  const mySup = (employee.department_assignments ?? []).filter((a: any) => a.is_primary_supervisor).map((a: any) => a.department_id);
  const mySections = (employee.staff_section_assignments ?? []).map((a: any) => a.section_id);
  const ec = employee.emergency_contact ?? {};

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api({
        action: "update",
        profile_id: employee.id,
        full_name: String(fd.get("full_name")),
        store_id: String(fd.get("store_id")),
        role: String(fd.get("role")),
        position_id: (fd.get("position_id") as string) || null,
        phone: (fd.get("phone") as string) || null,
        email: (fd.get("email") as string) || null,
        date_hired: (fd.get("date_hired") as string) || null,
        emergency_contact: {
          name: (fd.get("ec_name") as string) || "",
          relation: (fd.get("ec_relation") as string) || "",
          phone: (fd.get("ec_phone") as string) || "",
        },
        department_ids: fd.getAll("department_ids").map(String),
        section_ids: fd.getAll("section_ids").map(String),
        is_supervisor_of: fd.getAll("supervisor_of").map(String),
      });
      setOpen(false);
      router.refresh();
    } catch (err: any) { alert(err.message); } finally { setBusy(false); }
  }

  return (
    <>
      <button className="btn-secondary !px-2 !py-1" title="Edit" onClick={() => setOpen(true)}>
        <Pencil size={13} />
      </button>
      <Modal title={`Edit ${employee.full_name}`} open={open} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Employee ID</label><input className="input" value={employee.employee_code} disabled /></div>
            <div><label className="label">Full Name *</label><input name="full_name" className="input" defaultValue={employee.full_name} required /></div>
            <div>
              <label className="label">Branch *</label>
              <select name="store_id" className="input" defaultValue={employee.store_id} required>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Role *</label>
              <select name="role" className="input" defaultValue={employee.role}>
                <option value="staff">Staff</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Position</label>
              <select name="position_id" className="input" defaultValue={employee.position_id ?? ""}>
                <option value="">—</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div><label className="label">Date Hired</label><input name="date_hired" type="date" className="input" defaultValue={employee.date_hired ?? ""} /></div>
            <div><label className="label">Phone</label><input name="phone" className="input" defaultValue={employee.phone ?? ""} /></div>
            <div><label className="label">Personal Email</label><input name="email" type="email" className="input" defaultValue={employee.email ?? ""} /></div>
          </div>
          <div>
            <label className="label">Departments</label>
            <div className="grid grid-cols-2 gap-1">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="department_ids" value={d.id} defaultChecked={myDepts.includes(d.id)} /> {d.name}
                </label>
              ))}
            </div>
          </div>
          <SectionsPicker sections={sections} selected={mySections} />
          <div>
            <label className="label">Supervisor of</label>
            <div className="grid grid-cols-2 gap-1">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="supervisor_of" value={d.id} defaultChecked={mySup.includes(d.id)} /> {d.name}
                </label>
              ))}
            </div>
          </div>
          <fieldset className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <legend className="px-1 text-xs font-medium text-slate-500">Emergency Contact</legend>
            <div className="grid grid-cols-3 gap-2">
              <input name="ec_name" className="input" placeholder="Name" defaultValue={ec.name ?? ""} />
              <input name="ec_relation" className="input" placeholder="Relation" defaultValue={ec.relation ?? ""} />
              <input name="ec_phone" className="input" placeholder="Phone" defaultValue={ec.phone ?? ""} />
            </div>
          </fieldset>
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button>
        </form>
      </Modal>
    </>
  );
}

export function EmployeeRowActions({ employee, departments }: { employee: any; departments: any[] }) {
  const [busy, setBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [reveal, setReveal] = useState<{ employee: string; password: string } | null>(null);
  const router = useRouter();

  async function setLeave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const r = await api({
        action: "set_leave",
        profile_id: employee.id,
        date_from: String(fd.get("date_from")),
        date_to: String(fd.get("date_to") || fd.get("date_from")),
        status: String(fd.get("status")),
      });
      alert(`${r.affected} rostered day(s) updated for ${employee.full_name}.`);
      setLeaveOpen(false);
      router.refresh();
    } catch (err: any) { alert(err.message); } finally { setBusy(false); }
  }

  async function resetPassword() {
    const pw = generatePassword();
    if (!confirm(`Generate a new temporary password for ${employee.full_name}? Their old password will stop working.`)) return;
    setBusy(true);
    try {
      await api({ action: "reset_password", profile_id: employee.id, password: pw });
      setReveal({ employee: employee.full_name, password: pw });
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function toggleStatus() {
    const next = employee.status === "active" ? "suspended" : "active";
    if (!confirm(`Set ${employee.full_name} to ${next}?`)) return;
    setBusy(true);
    try {
      await api({ action: "set_status", profile_id: employee.id, status: next });
      router.refresh();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex gap-1">
      <button className="btn-secondary !px-2 !py-1" title="Leave / off roster" disabled={busy} onClick={() => setLeaveOpen(true)}>
        <CalendarOff size={13} />
      </button>
      <button className="btn-secondary !px-2 !py-1" title="Reset password" disabled={busy} onClick={resetPassword}>
        <KeyRound size={13} />
      </button>
      <button className={`!px-2 !py-1 ${employee.status === "active" ? "btn-danger" : "btn-primary"}`}
        title={employee.status === "active" ? "Disable account" : "Enable account"} disabled={busy} onClick={toggleStatus}>
        <Power size={13} />
      </button>

      <Modal title={`Leave / roster — ${employee.full_name}`} open={leaveOpen} onClose={() => setLeaveOpen(false)}>
        <form onSubmit={setLeave} className="space-y-3">
          <p className="text-xs text-slate-500">
            Marks the chosen days as leave or off so they drop off the auto-generated roster.
            Pick “Back on roster” to undo (restores scheduled days).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">From *</label><input name="date_from" type="date" className="input" defaultValue={today} required /></div>
            <div><label className="label">To</label><input name="date_to" type="date" className="input" defaultValue={today} /></div>
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input" defaultValue="leave">
              <option value="leave">On leave</option>
              <option value="off">Day off</option>
              <option value="scheduled">Back on roster</option>
            </select>
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Applying…" : "Apply"}</button>
        </form>
      </Modal>
      {reveal && <PasswordReveal employee={reveal.employee} password={reveal.password} onClose={() => setReveal(null)} />}
    </div>
  );
}
