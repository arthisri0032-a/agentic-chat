/**
 * Fixed categorical hue per department, in the validated adjacent-safe order
 * from the reference palette (see the dataviz skill's palette.md) — so the
 * same department always reads as the same colour, and a filtered or sorted
 * table never repaints the survivors.
 */
const KNOWN: Record<string, string> = {
  Science: "#2a78d6",
  Mathematics: "#eb6834",
  "Computer Science": "#1baf7a",
  Humanities: "#eda100",
  Arts: "#e87ba4",
  Athletics: "#008300",
};

// Any department outside the known list still gets a stable colour, assigned
// on first sight from the two remaining palette slots.
const FALLBACK_SLOTS = ["#4a3aa7", "#e34948"];
const fallbackAssignments = new Map<string, string>();

export function departmentColor(department: string): string {
  const known = KNOWN[department];
  if (known) return known;

  if (!fallbackAssignments.has(department)) {
    fallbackAssignments.set(department, FALLBACK_SLOTS[fallbackAssignments.size % FALLBACK_SLOTS.length]);
  }
  return fallbackAssignments.get(department)!;
}
