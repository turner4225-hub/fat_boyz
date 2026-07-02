/**
 * Format a plain ISO date string ("YYYY-MM-DD") for display without the
 * timezone off-by-one bug. `new Date("2026-07-06")` is parsed as UTC midnight,
 * which renders as the previous day in any timezone behind UTC. Appending a
 * local time component forces local parsing so the date shown matches the date
 * stored.
 */
export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString();
}

/** Trim trailing ".0" so 240.0 shows as 240 but 239.6 stays 239.6. */
export function fmtWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
