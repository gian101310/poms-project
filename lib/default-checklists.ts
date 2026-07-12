// Default task library per department code. Used to prefill new checklist
// templates — admin can then add/remove tasks freely.

export type DefaultTask = {
  title: string;
  description?: string;
  priority?: "low" | "normal" | "high" | "critical";
  tags?: string[];
  requires_photo?: boolean;
};

const ANIMAL_CORE: DefaultTask[] = [
  { title: "Visual health check of every animal", description: "Look for lethargy, discharge, abnormal droppings, injuries", priority: "critical", tags: ["animal_health"] },
  { title: "Fresh water in all enclosures", priority: "critical", tags: ["animal_health"] },
  { title: "Feed per feeding chart", priority: "high", tags: ["animal_health"] },
  { title: "Spot-clean enclosures & remove waste", priority: "high", tags: ["cleaning"] },
  { title: "Check enclosure temperature & ventilation", priority: "high", tags: ["animal_health", "equipment"] },
  { title: "Log daily monitoring record for flagged animals", tags: ["animal_health"] },
  { title: "Check stock of feed & bedding", tags: ["low_stock"] },
  { title: "Clean glass/viewing panels", tags: ["cleaning"] },
  { title: "Check locks and enclosure security", priority: "high", tags: ["equipment"] },
];

export const DEFAULT_CHECKLISTS: Record<string, DefaultTask[]> = {
  BIRDS: [
    ...ANIMAL_CORE,
    { title: "Replace cage liners", tags: ["cleaning"] },
    { title: "Check wings/feather condition for plucking", tags: ["animal_health"] },
    { title: "Rotate perches & enrichment toys", tags: ["animal_health"] },
  ],
  DOGS: [
    ...ANIMAL_CORE,
    { title: "Exercise / socialization rotation", priority: "high", tags: ["animal_health"] },
    { title: "Wash food & water bowls", tags: ["cleaning"] },
    { title: "Check vaccination card of new arrivals", priority: "high", tags: ["animal_health"] },
  ],
  CATS: [
    ...ANIMAL_CORE,
    { title: "Clean litter trays", priority: "high", tags: ["cleaning"] },
    { title: "Grooming check (matting, ears, eyes)", tags: ["animal_health"] },
  ],
  SMALL: [
    ...ANIMAL_CORE,
    { title: "Check bedding depth & dryness", tags: ["cleaning"] },
    { title: "Check teeth/nails on handled animals", tags: ["animal_health"] },
  ],
  GROOM: [
    { title: "Sanitize grooming tools & tables", priority: "critical", tags: ["cleaning", "equipment"] },
    { title: "Check clipper blades & replace if dull", tags: ["equipment"] },
    { title: "Confirm today's grooming appointments", priority: "high", tags: ["customer_concern"] },
    { title: "Stock check: shampoo, conditioner, towels", tags: ["low_stock"] },
    { title: "Clean drains & dryer filters", tags: ["cleaning", "equipment"] },
    { title: "Wash & fold towels", tags: ["cleaning"] },
    { title: "End-of-shift deep clean of bathing area", priority: "high", tags: ["cleaning"] },
  ],
  BOARD: [
    { title: "Welfare check on every boarder", priority: "critical", tags: ["animal_health"] },
    { title: "Feed boarders per owner instructions", priority: "critical", tags: ["animal_health"] },
    { title: "Administer scheduled medications", priority: "critical", tags: ["animal_health"], requires_photo: true },
    { title: "Exercise / play time rotation", priority: "high", tags: ["animal_health"] },
    { title: "Clean kennels & replace bedding", priority: "high", tags: ["cleaning"] },
    { title: "Update owners with photo/message where promised", tags: ["customer_concern"] },
    { title: "Check tomorrow's arrivals & departures", tags: ["customer_concern"] },
  ],
  WAREHOUSE: [
    { title: "Receive & log incoming deliveries", priority: "high", tags: ["low_stock"] },
    { title: "Check expiry dates on perishables (FIFO rotation)", priority: "critical", tags: ["low_stock"] },
    { title: "Restock sales floor from warehouse", priority: "high", tags: ["low_stock"] },
    { title: "Update low-stock list for reordering", priority: "high", tags: ["low_stock"] },
    { title: "Sweep floors & clear walkways", tags: ["cleaning"] },
    { title: "Check pest traps", tags: ["cleaning"] },
    { title: "Verify storage temperatures (frozen/chilled feed)", priority: "high", tags: ["equipment"] },
  ],
  SALES: [
    { title: "Face & front all shelves", priority: "high", tags: ["cleaning"] },
    { title: "Check price tags present on all products", priority: "high", tags: ["low_stock"] },
    { title: "Restock low shelves from warehouse", priority: "high", tags: ["low_stock"] },
    { title: "Dust & clean display areas", tags: ["cleaning"] },
    { title: "Check promotional displays & signage", tags: ["customer_concern"] },
    { title: "Walk the floor for hazards (spills, broken items)", priority: "high", tags: ["cleaning"] },
    { title: "Verify barcodes scan correctly on new items", tags: ["equipment"] },
  ],
  CASHIER: [
    { title: "Count opening float & log", priority: "critical", tags: ["equipment"] },
    { title: "Test POS, scanner & card terminal", priority: "high", tags: ["equipment"] },
    { title: "Stock bags, receipt rolls & till supplies", tags: ["low_stock"] },
    { title: "Clean counter & customer area", tags: ["cleaning"] },
    { title: "Process due refunds/exchanges", tags: ["customer_concern"] },
    { title: "End-of-shift till count & reconciliation", priority: "critical", tags: ["equipment"] },
  ],
  PHARMA: [
    { title: "Check expiry dates; pull expired medication", priority: "critical", tags: ["low_stock"] },
    { title: "Secure prescription / controlled items", priority: "critical", tags: ["equipment"] },
    { title: "Verify storage temperature for sensitive meds", priority: "high", tags: ["equipment"] },
    { title: "Face & front shelves; fill gaps; correct price labels", priority: "high", tags: ["low_stock"] },
    { title: "Restock OTC / supplements from stockroom", priority: "high", tags: ["low_stock"] },
    { title: "Dust shelves; wipe counter & glass", tags: ["cleaning"] },
    { title: "Log any dispensed prescriptions", tags: [] },
  ],
  KENNEL: [
    { title: "Welfare check on every boarder", priority: "critical", tags: ["animal_health"] },
    { title: "Feed boarders per owner instructions", priority: "critical", tags: ["animal_health"] },
    { title: "Administer scheduled medications", priority: "critical", tags: ["animal_health"], requires_photo: true },
    { title: "Exercise / play-time rotation", priority: "high", tags: ["animal_health"] },
    { title: "Clean kennels & replace bedding", priority: "high", tags: ["cleaning"] },
    { title: "Disinfect floors, drains & surfaces", priority: "high", tags: ["cleaning"] },
    { title: "Update owners with photo/message where promised", tags: ["customer_concern"] },
    { title: "Check today's arrivals & departures", tags: ["customer_concern"] },
  ],
};

export const GENERIC_CHECKLIST: DefaultTask[] = [
  { title: "Opening walkthrough & hazard check", priority: "high", tags: ["cleaning"] },
  { title: "Clean & organize work area", tags: ["cleaning"] },
  { title: "Check stock levels & report shortages", tags: ["low_stock"] },
  { title: "Complete department-specific duties", priority: "high" },
  { title: "End-of-shift tidy & handover prep", priority: "high", tags: ["cleaning"] },
];

export function defaultTasksFor(deptCode: string): DefaultTask[] {
  return DEFAULT_CHECKLISTS[deptCode?.toUpperCase()] ?? GENERIC_CHECKLIST;
}
