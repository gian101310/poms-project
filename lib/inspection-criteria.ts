// Department-relevant inspection criteria. Prefills the inspection form;
// the inspector can add/remove lines freely.

const RETAIL = [
  "Prices visible on all products",
  "Barcodes correct & scanning",
  "Shelves clean & dust-free",
  "Well stocked / no empty facings",
  "Organized & properly faced",
  "Promotional signage correct",
  "No expired products on shelf",
];

const ANIMAL = [
  "Animals alert & healthy appearance",
  "Fresh water in all enclosures",
  "Enclosures clean (no waste buildup)",
  "Correct temperature & ventilation",
  "Feed stock adequate & in date",
  "Enclosure locks secure",
  "Health records up to date",
];

export const DEPT_CRITERIA: Record<string, string[]> = {
  BIRDS: ANIMAL,
  DOGS: ANIMAL,
  CATS: ANIMAL,
  SMALL: ANIMAL,
  BOARD: [
    "All boarders checked & logged",
    "Feeding per owner instructions",
    "Medication log complete",
    "Kennels clean & dry bedding",
    "Owner updates sent",
    "Arrivals/departures board current",
  ],
  GROOM: [
    "Tools sanitized & stored",
    "Bathing area clean & drained",
    "Appointment book up to date",
    "Consumables stocked",
    "Dryer filters clean",
    "Waste hair disposed",
  ],
  WAREHOUSE: [
    "Deliveries logged & put away",
    "FIFO rotation followed / no expired stock",
    "Walkways clear & safe",
    "Storage temperatures correct",
    "Low-stock list updated",
    "Organized & labelled shelving",
  ],
  SALES: RETAIL,
  CASHIER: [
    "Till float correct",
    "POS / scanner / card terminal working",
    "Receipt rolls & bags stocked",
    "Counter clean & organized",
    "Queue area clear",
    "Refund log complete",
  ],
};

export const GENERIC_CRITERIA = [
  "Cleanliness",
  "Organization",
  "Stock levels",
  "Equipment condition",
  "Safety compliance",
];

export function criteriaFor(deptCode: string | undefined): string[] {
  return (deptCode && DEPT_CRITERIA[deptCode.toUpperCase()]) || GENERIC_CRITERIA;
}
