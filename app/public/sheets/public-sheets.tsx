"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ClipboardList, Plus, Printer, RotateCcw, Scissors, Trash2 } from "lucide-react";

type BoardingRow = {
  id: string;
  animalType: string;
  animalName: string;
  breed: string;
  size: string;
  cageColor: string;
  cageNumber: string;
  healthStatus: string;
  report: string;
};

type GroomingRow = {
  id: string;
  petName: string;
  breed: string;
  color: string;
  groomer: string;
  bookedTime: string;
  statusOutcome: string;
  note: string;
};

const animalTypes = ["Dog", "Cat", "Rabbit", "Guinea Pig", "Bird"];
const sizes = ["Toy", "Small", "Medium", "Large", "Giant"];
const cageColors = ["Black", "Blue", "Brown", "Green", "Grey", "Orange", "Pink", "Purple", "Red", "Silver", "White", "Yellow"];
const healthStatuses = ["Normal", "Needs observation", "Medication required", "Not eating", "Vomiting", "Diarrhea", "Limping", "Skin issue", "Eye/ear issue", "Emergency"];
const groomingStatuses = ["Booked", "Confirmed", "Arrived", "In progress", "Completed", "Paid", "Unpaid", "No show", "Cancelled", "Needs follow-up"];
const groomers = ["Alfred", "Alex", "Chris", "Garry"];

const breeds = [
  "Abyssinian", "African Grey", "Amazon Parrot", "Angora Rabbit", "Beagle", "Bengal", "British Shorthair",
  "Budgie", "Bulldog", "Burmese", "Caique", "Canary", "Chihuahua", "Cockatiel", "Conure", "Dachshund",
  "Dutch Rabbit", "Finch", "French Bulldog", "German Shepherd", "Golden Retriever", "Guinea Pig Abyssinian",
  "Guinea Pig American", "Guinea Pig Peruvian", "Holland Lop", "Indian Ringneck", "Labrador Retriever",
  "Lionhead Rabbit", "Lovebird", "Maine Coon", "Maltese", "Mini Lop", "Netherland Dwarf", "Persian",
  "Pomeranian", "Poodle", "Ragdoll", "Scottish Fold", "Shih Tzu", "Siamese", "Syrian Hamster", "Yorkshire Terrier",
  "Mixed Breed", "Other",
];

const colors = ["Black", "Brown", "White", "Cream", "Golden", "Grey", "Ginger", "Tan", "Tri-color", "Brindle", "Merle", "Spotted", "Mixed", "Other"];

function id() {
  return crypto.randomUUID();
}

function blankBoarding(): BoardingRow {
  return {
    id: id(),
    animalType: "Dog",
    animalName: "",
    breed: "",
    size: "Medium",
    cageColor: "",
    cageNumber: "",
    healthStatus: "Normal",
    report: "",
  };
}

function blankGrooming(): GroomingRow {
  return {
    id: id(),
    petName: "",
    breed: "",
    color: "",
    groomer: "Alfred",
    bookedTime: "",
    statusOutcome: "Booked",
    note: "",
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Toolbar({
  active,
  setActive,
  reset,
}: {
  active: "boarding" | "grooming";
  setActive: (value: "boarding" | "grooming") => void;
  reset: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Public Pet Sheets</h1>
          <p className="text-sm text-slate-500">Boarding animal report and grooming request forms</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            <button className={`btn !py-1.5 ${active === "boarding" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300"}`} onClick={() => setActive("boarding")}>
              <ClipboardList size={15} /> Boarding
            </button>
            <button className={`btn !py-1.5 ${active === "grooming" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300"}`} onClick={() => setActive("grooming")}>
              <Scissors size={15} /> Grooming
            </button>
          </div>
          <button className="btn-secondary" onClick={reset}><RotateCcw size={15} /> Reset</button>
          <button className="btn-primary" onClick={() => window.print()}><Printer size={15} /> Print</button>
        </div>
      </div>
    </div>
  );
}

function BoardingSheet() {
  const [rows, setRows] = useState<BoardingRow[]>([blankBoarding(), blankBoarding(), blankBoarding()]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function update(rowId: string, patch: Partial<BoardingRow>) {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, ...patch } : row));
  }

  return (
    <section className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Boarding Animals Report Sheet</h2>
          <p className="text-sm text-slate-500">Use for dogs, cats, rabbits, guinea pigs, and birds.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button className="btn-primary" onClick={() => setRows((current) => [...current, blankBoarding()])}><Plus size={15} /> Add animal</button>
        </div>
      </div>

      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-4 print:grid-cols-4">
        <Field label="Branch"><input className="input" placeholder="Branch name" /></Field>
        <Field label="Report date"><input className="input" type="date" defaultValue={today} /></Field>
        <Field label="Prepared by"><input className="input" placeholder="Staff name" /></Field>
        <Field label="Shift"><select className="input" defaultValue="Morning"><option>Morning</option><option>Afternoon</option><option>Closing</option></select></Field>
      </div>

      <datalist id="boarding-breeds">{breeds.map((breed) => <option key={breed} value={breed} />)}</datalist>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Animal {index + 1}</p>
              {rows.length > 1 && (
                <button className="btn-secondary !px-2 !py-1 print:hidden" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} title="Remove animal">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Animal type"><select className="input" value={row.animalType} onChange={(e) => update(row.id, { animalType: e.target.value })}>{animalTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Animal name"><input className="input" value={row.animalName} onChange={(e) => update(row.id, { animalName: e.target.value })} placeholder="Pet name" /></Field>
              <Field label="Breed"><input className="input" list="boarding-breeds" value={row.breed} onChange={(e) => update(row.id, { breed: e.target.value })} placeholder="Search or type breed" /></Field>
              <Field label="Size"><select className="input" value={row.size} onChange={(e) => update(row.id, { size: e.target.value })}>{sizes.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Cage color"><select className="input" value={row.cageColor} onChange={(e) => update(row.id, { cageColor: e.target.value })}><option value="">Select color</option>{cageColors.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Cage number"><input className="input" value={row.cageNumber} onChange={(e) => update(row.id, { cageNumber: e.target.value })} placeholder="Cage no." /></Field>
              <Field label="Health status"><select className="input" value={row.healthStatus} onChange={(e) => update(row.id, { healthStatus: e.target.value })}>{healthStatuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Health status report"><input className="input" value={row.report} onChange={(e) => update(row.id, { report: e.target.value })} placeholder="Short report" /></Field>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GroomingSheet() {
  const [rows, setRows] = useState<GroomingRow[]>([blankGrooming(), blankGrooming(), blankGrooming()]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function update(rowId: string, patch: Partial<GroomingRow>) {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, ...patch } : row));
  }

  return (
    <section className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Grooming Request Sheet</h2>
          <p className="text-sm text-slate-500">Use this for daily grooming bookings and final outcome notes.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button className="btn-primary" onClick={() => setRows((current) => [...current, blankGrooming()])}><Plus size={15} /> Add request</button>
        </div>
      </div>

      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-4 print:grid-cols-4">
        <Field label="Branch"><input className="input" placeholder="Branch name" /></Field>
        <Field label="Booking date"><input className="input" type="date" defaultValue={today} /></Field>
        <Field label="Prepared by"><input className="input" placeholder="Staff name" /></Field>
        <Field label="Contact number"><input className="input" placeholder="Client contact" /></Field>
      </div>

      <datalist id="grooming-breeds">{breeds.map((breed) => <option key={breed} value={breed} />)}</datalist>
      <datalist id="pet-colors">{colors.map((color) => <option key={color} value={color} />)}</datalist>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Request {index + 1}</p>
              {rows.length > 1 && (
                <button className="btn-secondary !px-2 !py-1 print:hidden" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} title="Remove request">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Pet name"><input className="input" value={row.petName} onChange={(e) => update(row.id, { petName: e.target.value })} placeholder="Pet name" /></Field>
              <Field label="Breed"><input className="input" list="grooming-breeds" value={row.breed} onChange={(e) => update(row.id, { breed: e.target.value })} placeholder="Search or type breed" /></Field>
              <Field label="Color"><input className="input" list="pet-colors" value={row.color} onChange={(e) => update(row.id, { color: e.target.value })} placeholder="Select or type color" /></Field>
              <Field label="Groomer booked"><select className="input" value={row.groomer} onChange={(e) => update(row.id, { groomer: e.target.value })}>{groomers.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Time"><input className="input" type="time" value={row.bookedTime} onChange={(e) => update(row.id, { bookedTime: e.target.value })} /></Field>
              <Field label="Status outcome"><select className="input" value={row.statusOutcome} onChange={(e) => update(row.id, { statusOutcome: e.target.value })}>{groomingStatuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <label className="block md:col-span-2">
                <span className="label">Note</span>
                <input className="input" value={row.note} onChange={(e) => update(row.id, { note: e.target.value })} placeholder="Special instruction, outcome, or follow-up" />
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PublicSheets() {
  const [active, setActive] = useState<"boarding" | "grooming">("boarding");
  const [version, setVersion] = useState(0);

  return (
    <main key={version} className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Toolbar active={active} setActive={setActive} reset={() => setVersion((current) => current + 1)} />
      {active === "boarding" ? <BoardingSheet /> : <GroomingSheet />}
    </main>
  );
}
