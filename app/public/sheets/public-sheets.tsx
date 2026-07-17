"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle2, ClipboardList, LockKeyhole, Plus, Printer, RotateCcw, Scissors, Send, ShieldCheck, Trash2,
} from "lucide-react";

type PetType = "Dog" | "Cat" | "Bird" | "Reptile" | "Rabbit" | "Guinea Pig" | "Hamster" | "Sugar Glider" | "Fancy Mouse" | "Rat" | "Degu";
type BoardingCategory = "dogs" | "cats" | "birds" | "reptiles" | "small_animals";

type StaffOption = {
  id: string;
  full_name: string;
  employee_code: string;
};

type BoardingRow = {
  id: string;
  petType: PetType;
  animalName: string;
  breed: string;
  size: string;
  cageColor: string;
  cageNumber: string;
  healthStatus: string;
  report: string;
  feedingDone: boolean;
  cleaningDone: boolean;
  walkingDone: boolean;
};

type GroomingRow = {
  id: string;
  petType: PetType;
  petName: string;
  breed: string;
  color: string;
  groomer: string;
  bookedTime: string;
  statusOutcome: string;
  note: string;
};

type InspectionRow = {
  id: string;
  petType: PetType;
  breed: string;
  cageNumber: string;
  area: string;
  condition: string;
  action: string;
  inspectedBy: string;
  note: string;
};

const petTypes: PetType[] = ["Dog", "Cat", "Bird", "Reptile", "Rabbit", "Guinea Pig", "Hamster", "Sugar Glider", "Fancy Mouse", "Rat", "Degu"];
const boardingCategories: { id: BoardingCategory; label: string; petTypes: PetType[] }[] = [
  { id: "dogs", label: "Dogs Boarding", petTypes: ["Dog"] },
  { id: "cats", label: "Cats Boarding", petTypes: ["Cat"] },
  { id: "birds", label: "Birds Boarding", petTypes: ["Bird"] },
  { id: "reptiles", label: "Reptile Boarding", petTypes: ["Reptile"] },
  { id: "small_animals", label: "Small Animals Boarding", petTypes: ["Rabbit", "Guinea Pig", "Hamster", "Sugar Glider", "Fancy Mouse", "Rat", "Degu"] },
];
const sizes = ["Toy", "Small", "Medium", "Large", "Giant"];
const cageColors = ["Black", "Blue", "Brown", "Green", "Grey", "Orange", "Pink", "Purple", "Red", "Silver", "White", "Yellow"];
const healthStatuses = ["Normal", "Needs observation", "Medication required", "Not eating", "Vomiting", "Diarrhea", "Limping", "Skin issue", "Eye/ear issue", "Emergency"];
const groomingStatuses = ["Booked", "Confirmed", "Arrived", "In progress", "Completed", "Paid", "Unpaid", "No show", "Cancelled", "Needs follow-up"];
const inspectionConditions = ["Good", "Needs cleaning", "Needs feeding", "Needs water", "Needs medicine", "Needs supervisor", "Urgent"];
const groomers = ["Alfred", "Alex", "Chris", "Garry"];

const breedByType: Record<PetType, string[]> = {
  Dog: [
    "Affenpinscher", "Afghan Hound", "Airedale Terrier", "Akita", "Alaskan Malamute", "American Bully",
    "Australian Shepherd", "Basenji", "Basset Hound", "Beagle", "Belgian Malinois", "Bernese Mountain Dog",
    "Bichon Frise", "Border Collie", "Boston Terrier", "Boxer", "Bulldog", "Bull Terrier", "Cane Corso",
    "Cavalier King Charles Spaniel", "Chihuahua", "Chow Chow", "Cocker Spaniel", "Collie", "Corgi",
    "Dachshund", "Dalmatian", "Doberman", "French Bulldog", "German Shepherd", "Golden Retriever",
    "Great Dane", "Havanese", "Husky", "Jack Russell Terrier", "Labrador Retriever", "Lhasa Apso",
    "Maltese", "Miniature Schnauzer", "Pekingese", "Pit Bull", "Pomeranian", "Poodle", "Pug",
    "Rottweiler", "Samoyed", "Shar Pei", "Shiba Inu", "Shih Tzu", "Toy Poodle", "Yorkshire Terrier",
    "Mixed Breed", "Other",
  ],
  Cat: [
    "Abyssinian", "American Shorthair", "Bengal", "Birman", "British Longhair", "British Shorthair",
    "Burmese", "Devon Rex", "Domestic Longhair", "Domestic Shorthair", "Egyptian Mau", "Exotic Shorthair",
    "Himalayan", "Maine Coon", "Munchkin", "Norwegian Forest Cat", "Oriental Shorthair", "Persian",
    "Ragdoll", "Russian Blue", "Savannah", "Scottish Fold", "Siamese", "Siberian", "Sphynx",
    "Turkish Angora", "Mixed Breed", "Other",
  ],
  Rabbit: [
    "Angora Rabbit", "Dutch Rabbit", "Dwarf Hotot", "English Lop", "Flemish Giant", "French Lop",
    "Harlequin", "Havana Rabbit", "Himalayan Rabbit", "Holland Lop", "Jersey Wooly", "Lionhead Rabbit",
    "Mini Lop", "Mini Rex", "Netherland Dwarf", "New Zealand Rabbit", "Polish Rabbit", "Rex Rabbit",
    "Other",
  ],
  "Guinea Pig": [
    "Abyssinian Guinea Pig", "American Guinea Pig", "Coronet Guinea Pig", "Peruvian Guinea Pig",
    "Rex Guinea Pig", "Sheba Guinea Pig", "Silkie Guinea Pig", "Skinny Pig", "Teddy Guinea Pig",
    "Texel Guinea Pig", "White Crested Guinea Pig", "Other",
  ],
  Bird: [
    "African Grey", "Amazon Parrot", "Budgie", "Caique", "Canary", "Cockatiel", "Conure", "Eclectus",
    "Finch", "Galah Cockatoo", "Indian Ringneck", "Lovebird", "Macaw", "Parrotlet", "Quaker Parrot",
    "Rosella", "Senegal Parrot", "Sun Conure", "Zebra Finch", "Other Bird",
  ],
  Reptile: [
    "Tortoise", "Turtle", "Gecko", "Leopard Gecko", "Fat Tail Gecko", "Crested Gecko", "Sugar Glider",
    "Bearded Dragon", "Tarantula", "Chameleon", "Snake", "Ball Python", "Corn Snake", "King Snake",
    "Milk Snake", "Axolotl", "Sulcata Tortoise", "Greek Tortoise", "Red-Eared Slider", "Other Reptile",
  ],
  Hamster: ["Syrian Hamster", "Dwarf Hamster", "Roborovski Hamster", "Chinese Hamster", "Winter White Hamster", "Other Hamster"],
  "Sugar Glider": ["Classic Grey Sugar Glider", "Leucistic Sugar Glider", "Mosaic Sugar Glider", "White Face Sugar Glider", "Other Sugar Glider"],
  "Fancy Mouse": ["Fancy Mouse", "Satin Mouse", "Rex Mouse", "Long Hair Mouse", "Other Mouse"],
  Rat: ["Fancy Rat", "Dumbo Rat", "Rex Rat", "Hairless Rat", "Other Rat"],
  Degu: ["Common Degu", "Blue Degu", "Sand Degu", "Other Degu"],
};

const colors = ["Black", "Brown", "White", "Cream", "Golden", "Grey", "Ginger", "Tan", "Tri-color", "Brindle", "Merle", "Spotted", "Mixed", "Other"];

function id() {
  return crypto.randomUUID();
}

function blankBoarding(petType: PetType = "Dog"): BoardingRow {
  return {
    id: id(),
    petType,
    animalName: "",
    breed: "",
    size: "Medium",
    cageColor: "",
    cageNumber: "",
    healthStatus: "Normal",
    report: "",
    feedingDone: false,
    cleaningDone: false,
    walkingDone: false,
  };
}

function blankGrooming(): GroomingRow {
  return {
    id: id(),
    petType: "Dog",
    petName: "",
    breed: "",
    color: "",
    groomer: "Alfred",
    bookedTime: "",
    statusOutcome: "Booked",
    note: "",
  };
}

function blankInspection(): InspectionRow {
  return {
    id: id(),
    petType: "Dog",
    breed: "",
    cageNumber: "",
    area: "",
    condition: "Good",
    action: "",
    inspectedBy: "",
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

function BreedSearch({
  idPrefix,
  rowId,
  petType,
  value,
  onChange,
}: {
  idPrefix: string;
  rowId: string;
  petType: PetType;
  value: string;
  onChange: (value: string) => void;
}) {
  const listId = `${idPrefix}-${rowId}`;
  return (
    <>
      <input className="input" list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Search ${petType.toLowerCase()} breed/type`} />
      <datalist id={listId}>{breedByType[petType].map((breed) => <option key={breed} value={breed} />)}</datalist>
    </>
  );
}

function DoneToggle({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`btn !py-1.5 ${pressed ? "bg-green-600 text-white hover:bg-green-700" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}
      onClick={onClick}
    >
      <CheckCircle2 size={15} /> {label}
    </button>
  );
}

function Toolbar({
  active,
  setActive,
  reset,
}: {
  active: "boarding" | "grooming" | "inspection";
  setActive: (value: "boarding" | "grooming" | "inspection") => void;
  reset: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Public Pet Sheets</h1>
          <p className="text-sm text-slate-500">Boarding, grooming, and admin inspection sheets</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            <button className={`btn !py-1.5 ${active === "boarding" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300"}`} onClick={() => setActive("boarding")}>
              <ClipboardList size={15} /> Boarding
            </button>
            <button className={`btn !py-1.5 ${active === "grooming" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300"}`} onClick={() => setActive("grooming")}>
              <Scissors size={15} /> Grooming
            </button>
            <button className={`btn !py-1.5 ${active === "inspection" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300"}`} onClick={() => setActive("inspection")}>
              <ShieldCheck size={15} /> Inspection
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
  const [activeCategory, setActiveCategory] = useState<BoardingCategory>("dogs");
  const [rowsByCategory, setRowsByCategory] = useState<Record<BoardingCategory, BoardingRow[]>>({
    dogs: [blankBoarding("Dog"), blankBoarding("Dog"), blankBoarding("Dog")],
    cats: [blankBoarding("Cat"), blankBoarding("Cat")],
    birds: [blankBoarding("Bird"), blankBoarding("Bird")],
    reptiles: [blankBoarding("Reptile"), blankBoarding("Reptile")],
    small_animals: [blankBoarding("Rabbit"), blankBoarding("Guinea Pig")],
  });
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [submittedBy, setSubmittedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [reportDate, setReportDate] = useState(today);
  const activeConfig = boardingCategories.find((category) => category.id === activeCategory) ?? boardingCategories[0];
  const rows = rowsByCategory[activeCategory];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-sheets/staff", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setStaff(json.staff ?? []);
      })
      .catch(() => {
        if (!cancelled) setStaff([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(rowId: string, patch: Partial<BoardingRow>) {
    setRowsByCategory((current) => ({
      ...current,
      [activeCategory]: current[activeCategory].map((row) => row.id === rowId ? { ...row, ...patch } : row),
    }));
  }

  function addRow() {
    setRowsByCategory((current) => ({
      ...current,
      [activeCategory]: [...current[activeCategory], blankBoarding(activeConfig.petTypes[0])],
    }));
  }

  function removeRow(rowId: string) {
    setRowsByCategory((current) => ({
      ...current,
      [activeCategory]: current[activeCategory].filter((item) => item.id !== rowId),
    }));
  }

  async function submitReport() {
    setSubmitting(true);
    setMessage("");
    const chosenStaff = staff.find((item) => item.id === submittedBy);
    try {
      const res = await fetch("/api/public-sheets/kennel-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: activeCategory,
          report_date: reportDate,
          submitted_by_profile_id: chosenStaff?.id ?? null,
          submitted_by_name: chosenStaff ? `${chosenStaff.full_name} (${chosenStaff.employee_code})` : "",
          rows: rows.map((row) => ({
            pet_type: row.petType,
            animal_name: row.animalName,
            breed: row.breed,
            size: row.size,
            cage_color: row.cageColor,
            cage_number: row.cageNumber,
            health_status: row.healthStatus,
            report: row.report,
            feeding_done: row.feedingDone,
            cleaning_done: row.cleaningDone,
            walking_done: activeCategory === "dogs" ? row.walkingDone : false,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not submit report.");
      setMessage(`Submitted ${activeConfig.label} at ${new Date(json.report.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`);
    } catch (e: any) {
      setMessage(e.message ?? "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Boarding Animals Report Sheet</h2>
          <p className="text-sm text-slate-500">Submit kennel reports by boarding page; submissions appear in Command Center and Daily Reports.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button className="btn-primary" onClick={addRow}><Plus size={15} /> Add boarding</button>
          <button className="btn-primary" onClick={submitReport} disabled={submitting || !submittedBy}><Send size={15} /> {submitting ? "Submitting..." : "Submit report"}</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        {boardingCategories.map((category) => (
          <button
            key={category.id}
            className={`btn !py-1.5 ${activeCategory === category.id ? "bg-brand-600 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-4 print:grid-cols-4">
        <Field label="Branch"><input className="input" placeholder="Branch name" /></Field>
        <Field label="Report date"><input className="input" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></Field>
        <Field label="Staff name">
          <select className="input" value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)}>
            <option value="">Choose Springs staff</option>
            {staff.map((person) => <option key={person.id} value={person.id}>{person.full_name} ({person.employee_code})</option>)}
          </select>
        </Field>
        <Field label="Shift"><select className="input" defaultValue="Morning"><option>Morning</option><option>Afternoon</option><option>Closing</option></select></Field>
      </div>
      {message && <div className={`card mb-4 p-3 text-sm ${message.startsWith("Submitted") ? "text-green-700" : "text-red-600"}`}>{message}</div>}

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Boarding {index + 1}</p>
              {rows.length > 1 && (
                <button className="btn-secondary !px-2 !py-1 print:hidden" onClick={() => removeRow(row.id)} title="Remove boarding">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Pet type">
                <select className="input" value={row.petType} onChange={(e) => update(row.id, { petType: e.target.value as PetType, breed: "" })}>
                  {activeConfig.petTypes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Animal name"><input className="input" value={row.animalName} onChange={(e) => update(row.id, { animalName: e.target.value })} placeholder="Pet name" /></Field>
              <Field label="Breed / type">
                <BreedSearch idPrefix="boarding-breeds" rowId={row.id} petType={row.petType} value={row.breed} onChange={(breed) => update(row.id, { breed })} />
              </Field>
              <Field label="Size"><select className="input" value={row.size} onChange={(e) => update(row.id, { size: e.target.value })}>{sizes.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Cage color"><select className="input" value={row.cageColor} onChange={(e) => update(row.id, { cageColor: e.target.value })}><option value="">Select color</option>{cageColors.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Cage number"><input className="input" value={row.cageNumber} onChange={(e) => update(row.id, { cageNumber: e.target.value })} placeholder="Cage no." /></Field>
              <Field label="Health status"><select className="input" value={row.healthStatus} onChange={(e) => update(row.id, { healthStatus: e.target.value })}>{healthStatuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Health status report"><input className="input" value={row.report} onChange={(e) => update(row.id, { report: e.target.value })} placeholder="Short report" /></Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 print:hidden">
              <DoneToggle label="Done feeding" pressed={row.feedingDone} onClick={() => update(row.id, { feedingDone: !row.feedingDone })} />
              <DoneToggle label="Done cleaning" pressed={row.cleaningDone} onClick={() => update(row.id, { cleaningDone: !row.cleaningDone })} />
              {activeCategory === "dogs" && <DoneToggle label="Walking done" pressed={row.walkingDone} onClick={() => update(row.id, { walkingDone: !row.walkingDone })} />}
            </div>
            <div className="mt-3 hidden grid-cols-3 gap-2 text-xs print:grid">
              <span>Feeding: {row.feedingDone ? "Done" : "Pending"}</span>
              <span>Cleaning: {row.cleaningDone ? "Done" : "Pending"}</span>
              {activeCategory === "dogs" && <span>Walking: {row.walkingDone ? "Done" : "Pending"}</span>}
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
          <p className="text-sm text-slate-500">Pick pet type first, then search only matching breeds/types.</p>
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
              <Field label="Pet type">
                <select className="input" value={row.petType} onChange={(e) => update(row.id, { petType: e.target.value as PetType, breed: "" })}>
                  {petTypes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Pet name"><input className="input" value={row.petName} onChange={(e) => update(row.id, { petName: e.target.value })} placeholder="Pet name" /></Field>
              <Field label="Breed / type">
                <BreedSearch idPrefix="grooming-breeds" rowId={row.id} petType={row.petType} value={row.breed} onChange={(breed) => update(row.id, { breed })} />
              </Field>
              <Field label="Color"><input className="input" list="pet-colors" value={row.color} onChange={(e) => update(row.id, { color: e.target.value })} placeholder="Search or type color" /></Field>
              <Field label="Groomer booked"><select className="input" value={row.groomer} onChange={(e) => update(row.id, { groomer: e.target.value })}>{groomers.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Time"><input className="input" type="time" value={row.bookedTime} onChange={(e) => update(row.id, { bookedTime: e.target.value })} /></Field>
              <Field label="Status outcome"><select className="input" value={row.statusOutcome} onChange={(e) => update(row.id, { statusOutcome: e.target.value })}>{groomingStatuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <label className="block">
                <span className="label">Note</span>
                <input className="input" value={row.note} onChange={(e) => update(row.id, { note: e.target.value })} placeholder="Instruction or follow-up" />
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InspectionSheet() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<InspectionRow[]>([blankInspection(), blankInspection()]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function unlock() {
    const res = await fetch("/api/public-sheets/inspection", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = await res.json().catch(() => ({ ok: false }));
    if (json.ok) {
      setUnlocked(true);
      setError("");
    } else {
      setError("Wrong admin password.");
    }
  }

  function update(rowId: string, patch: Partial<InspectionRow>) {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, ...patch } : row));
  }

  if (!unlocked) {
    return (
      <section className="mx-auto max-w-md p-4 md:p-6">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
              <LockKeyhole size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Admin Inspection Sheet</h2>
              <p className="text-sm text-slate-500">Enter admin password to open inspection.</p>
            </div>
          </div>
          <Field label="Admin password">
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()} placeholder="Enter admin password" />
          </Field>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button className="btn-primary mt-4 w-full" onClick={unlock}><ShieldCheck size={15} /> Unlock inspection</button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Admin Inspection Sheet</h2>
          <p className="text-sm text-slate-500">Private quick inspection checklist for animal areas and cages.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button className="btn-primary" onClick={() => setRows((current) => [...current, blankInspection()])}><Plus size={15} /> Add inspection</button>
        </div>
      </div>

      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-4 print:grid-cols-4">
        <Field label="Branch"><input className="input" placeholder="Branch name" /></Field>
        <Field label="Inspection date"><input className="input" type="date" defaultValue={today} /></Field>
        <Field label="Admin"><input className="input" placeholder="Admin name" /></Field>
        <Field label="Shift"><select className="input" defaultValue="Morning"><option>Morning</option><option>Afternoon</option><option>Closing</option></select></Field>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Inspection {index + 1}</p>
              {rows.length > 1 && (
                <button className="btn-secondary !px-2 !py-1 print:hidden" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} title="Remove inspection">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Pet type">
                <select className="input" value={row.petType} onChange={(e) => update(row.id, { petType: e.target.value as PetType, breed: "" })}>
                  {petTypes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Breed / type">
                <BreedSearch idPrefix="inspection-breeds" rowId={row.id} petType={row.petType} value={row.breed} onChange={(breed) => update(row.id, { breed })} />
              </Field>
              <Field label="Cage number"><input className="input" value={row.cageNumber} onChange={(e) => update(row.id, { cageNumber: e.target.value })} placeholder="Cage no." /></Field>
              <Field label="Area"><input className="input" value={row.area} onChange={(e) => update(row.id, { area: e.target.value })} placeholder="Bird room, kennel, reptile rack" /></Field>
              <Field label="Condition"><select className="input" value={row.condition} onChange={(e) => update(row.id, { condition: e.target.value })}>{inspectionConditions.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Action needed"><input className="input" value={row.action} onChange={(e) => update(row.id, { action: e.target.value })} placeholder="Action or correction" /></Field>
              <Field label="Inspected by"><input className="input" value={row.inspectedBy} onChange={(e) => update(row.id, { inspectedBy: e.target.value })} placeholder="Name" /></Field>
              <Field label="Note"><input className="input" value={row.note} onChange={(e) => update(row.id, { note: e.target.value })} placeholder="Extra note" /></Field>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PublicSheets() {
  const [active, setActive] = useState<"boarding" | "grooming" | "inspection">("boarding");
  const [version, setVersion] = useState(0);

  return (
    <main key={version} className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Toolbar active={active} setActive={setActive} reset={() => setVersion((current) => current + 1)} />
      {active === "boarding" && <BoardingSheet />}
      {active === "grooming" && <GroomingSheet />}
      {active === "inspection" && <InspectionSheet />}
    </main>
  );
}
