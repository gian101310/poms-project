"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Phone, Plus, Scissors, WalletCards, XCircle } from "lucide-react";
import { createGroomingBooking, updateGroomingStatus } from "./actions";

export function GroomingBookingForm({ groomers, defaultDate, canAssign }: { groomers: any[]; defaultDate: string; canAssign: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add Booking</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <form className="card relative max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto p-5"
            action={(fd) => start(async () => {
              const r = await createGroomingBooking(fd);
              if (r?.error) alert(r.error);
              else setOpen(false);
              router.refresh();
            })}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Grooming Booking</h3>
              <button type="button" className="btn-secondary !px-2 !py-1" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Date *</label><input name="booking_date" type="date" className="input" defaultValue={defaultDate} required /></div>
              <div><label className="label">Hour</label><input name="appointment_time" type="time" className="input" /></div>
              {canAssign && (
                <div className="col-span-2">
                  <label className="label">Groomer *</label>
                  <select name="assigned_groomer_id" className="input" required>
                    {groomers.map((g) => <option key={g.id} value={g.id}>{g.full_name}</option>)}
                  </select>
                </div>
              )}
              <div><label className="label">Client name *</label><input name="client_name" className="input" required /></div>
              <div><label className="label">Client phone *</label><input name="client_phone" className="input" required /></div>
              <div><label className="label">Pet name</label><input name="pet_name" className="input" /></div>
              <div><label className="label">Pet type</label><input name="pet_type" className="input" defaultValue="Dog" /></div>
              <div><label className="label">Dog breed / type</label><input name="dog_breed" className="input" placeholder="Poodle, Shih Tzu, mixed..." /></div>
              <div>
                <label className="label">Payment</label>
                <select name="payment_status" className="input" defaultValue="unpaid">
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
            <div><label className="label">Notes</label><textarea name="service_notes" className="input" rows={3} /></div>
            <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving..." : "Save Booking"}</button>
          </form>
        </div>
      )}
    </>
  );
}

export function GroomingActions({ booking }: { booking: any }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function run(action: Parameters<typeof updateGroomingStatus>[1]) {
    start(async () => {
      let reason: string | undefined;
      if (action === "cannot_call") {
        reason = prompt("Why could the finished call not be made?") ?? undefined;
        if (!reason) return;
      }
      const r = await updateGroomingStatus(booking.id, action, reason);
      if (r?.error) alert(r.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {booking.status === "booked" && (
        <button className="btn-secondary !px-2 !py-1 !text-xs" disabled={pending} onClick={() => run("confirm")}>
          <Phone size={13} /> Confirmed
        </button>
      )}
      {booking.status !== "completed" && (
        <button className="btn-primary !px-2 !py-1 !text-xs" disabled={pending} onClick={() => run("complete")}>
          <Scissors size={13} /> Done
        </button>
      )}
      {booking.status === "completed" && !booking.finish_called_at && !booking.cannot_call_reason && (
        <>
          <button className="btn-secondary !px-2 !py-1 !text-xs" disabled={pending} onClick={() => run("finish_called")}>
            <Check size={13} /> Called
          </button>
          <button className="btn-secondary !px-2 !py-1 !text-xs text-amber-600" disabled={pending} onClick={() => run("cannot_call")}>
            <XCircle size={13} /> Cannot Call
          </button>
        </>
      )}
      <button className="btn-secondary !px-2 !py-1 !text-xs" disabled={pending} onClick={() => run(booking.payment_status === "paid" ? "unpaid" : "paid")}>
        <WalletCards size={13} /> {booking.payment_status === "paid" ? "Paid" : "Unpaid"}
      </button>
    </div>
  );
}
