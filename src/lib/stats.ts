import type { WeighIn } from "./types";

export interface MemberStats {
  userId: string;
  start: number; // earliest recorded weight
  current: number; // latest recorded weight
  count: number; // number of weigh-ins
  lostAbs: number; // start - current (positive = weight lost)
  lostPct: number; // percent of starting body weight lost
  lastWeighedOn: string | null; // ISO date of most recent weigh-in
}

/** Sort weigh-ins oldest → newest (by date, then insertion order). */
function chronological(a: WeighIn, b: WeighIn): number {
  if (a.weighed_on !== b.weighed_on) {
    return a.weighed_on.localeCompare(b.weighed_on);
  }
  return a.created_at.localeCompare(b.created_at);
}

/** Compute progress stats per user from a flat list of weigh-ins. */
export function statsByUser(weighIns: WeighIn[]): Map<string, MemberStats> {
  const byUser = new Map<string, WeighIn[]>();
  for (const w of weighIns) {
    const list = byUser.get(w.user_id) ?? [];
    list.push(w);
    byUser.set(w.user_id, list);
  }

  const result = new Map<string, MemberStats>();
  for (const [userId, list] of byUser) {
    list.sort(chronological);
    const start = list[0].weight;
    const latest = list[list.length - 1];
    const current = latest.weight;
    const lostAbs = start - current;
    const lostPct = start > 0 ? (lostAbs / start) * 100 : 0;
    result.set(userId, {
      userId,
      start,
      current,
      count: list.length,
      lostAbs,
      lostPct,
      lastWeighedOn: latest.weighed_on,
    });
  }
  return result;
}
