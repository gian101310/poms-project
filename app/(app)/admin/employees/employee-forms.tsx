"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, KeyRound, Power, Pencil } from "lucide-react";

function Modal({ title, open, onClose, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative max-h-[85vh] w-full max-w-lg overflow-y-auto p-5">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
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

export function EmployeeForm({ departments, positions }: { departments: any[]; positions: any[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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
        password: String(fd.get("password")),
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
      alert("Employee created. Give them their Employee ID and password.");
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
            <div><label className="label">Password *</label><input name="password" type="text" className="input" minLength={8} required /></div>
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
    </>
  );
}

export function EditEmployee({ employee, departments, positions }: { employee: any; departments: any[]; positions: any[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const myDepts = (employee.department_assignments ?? []).map((a: any) => a.department_id);
  const mySup = (employee.department_assignments ?? []).filter((a: any) => a.is_primary_supervisor).map((a: any) => a.department_id);
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
  const router = useRouter();

  async function resetPassword() {
    const pw = prompt(`New password for ${employee.full_name} (min 8 chars):`);
    if (!pw || pw.length < 8) return;
    setBusy(true);
    try {
      await api({ action: "reset_password", profile_id: employee.id, password: pw });
      alert("Password reset. Give it to the employee.");
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

  return (
    <div className="flex gap-1">
      <button className="btn-secondary !px-2 !py-1" title="Reset password" disabled={busy} onClick={resetPassword}>
        <KeyRound size={13} />
      </button>
      <button className={`!px-2 !py-1 ${employee.status === "active" ? "btn-danger" : "btn-primary"}`}
        title={employee.status === "active" ? "Disable account" : "Enable account"} disabled={busy} onClick={toggleStatus}>
        <Power size={13} />
      </button>
    </div>
  );
}
