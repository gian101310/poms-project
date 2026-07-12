"use client";
import { useRef, useTransition } from "react";
import { changeOwnPassword } from "./actions";
import { KeyRound } from "lucide-react";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    start(async () => {
      const result = await changeOwnPassword(fd);
      if (result?.error) {
        alert(result.error);
        return;
      }
      formRef.current?.reset();
      alert("Password changed.");
    });
  }

  return (
    <form ref={formRef} action={submit} className="card max-w-xl space-y-4 p-4">
      <div>
        <label className="label">Current password</label>
        <input name="current_password" type="password" className="input" required />
      </div>
      <div>
        <label className="label">New password</label>
        <input name="new_password" type="password" minLength={8} className="input" required />
      </div>
      <div>
        <label className="label">Confirm new password</label>
        <input name="confirm_password" type="password" minLength={8} className="input" required />
      </div>
      <button className="btn-primary" disabled={pending}>
        <KeyRound size={16} /> {pending ? "Changing..." : "Change password"}
      </button>
    </form>
  );
}
