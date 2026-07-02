import type { WeightUnit } from "./types";
import { convertWeight } from "./health";

export interface TimelinePoint {
  weighed_on: string; // ISO date
  weight: number; // in the requested display unit
}

/** A weigh-in row joined with its challenge's unit. */
export interface RawWeighIn {
  weight: number;
  weighed_on: string;
  created_at: string;
  unit: WeightUnit; // the challenge's unit
}

/**
 * Merge a user's weigh-ins from every challenge into one personal timeline in
 * `displayUnit`. When multiple weigh-ins share a date (e.g. logged to several
 * challenges at once), keep the most recently recorded one.
 */
export function buildTimeline(
  rows: RawWeighIn[],
  displayUnit: WeightUnit,
): TimelinePoint[] {
  const byDate = new Map<string, RawWeighIn>();
  for (const r of rows) {
    const existing = byDate.get(r.weighed_on);
    if (!existing || r.created_at > existing.created_at) {
      byDate.set(r.weighed_on, r);
    }
  }
  return [...byDate.values()]
    .map((r) => ({
      weighed_on: r.weighed_on,
      weight: convertWeight(r.weight, r.unit, displayUnit),
    }))
    .sort((a, b) => a.weighed_on.localeCompare(b.weighed_on));
}
