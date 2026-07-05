import type { Challenge, ChallengeMember, Profile, WeighIn } from "./types";
import type { MemberStats } from "./stats";
import { fmtWeight } from "./format";

export type MemberWithProfile = ChallengeMember & { profile: Profile | null };

export interface LeaderRow {
  rank: number;
  member: MemberWithProfile;
  stats: MemberStats | undefined;
  metric: number; // value used for ranking (higher = better)
  displayMetric: string; // the big number shown on the row
  ringFill: number; // 0..1 for the ring dial
  isLeader: boolean;
  reachedTarget: boolean;
  missed: boolean; // hasn't logged since the most recent weigh-in day
  tiedForRank: boolean; // shares this rank with another member (pot splits under "split")
}

export const WINNER_RULE_LABELS: Record<Challenge["winner_rule"], string> = {
  percent_lost: "% of body weight lost",
  total_lost: "Most weight lost",
  first_to_target: "First to hit a target",
  most_consistent: "Most consistent",
  last_standing: "Last one standing",
};

/** Signed percent, loss shown as negative like the mockup ("−7.1%"). */
export function pctLabel(s: MemberStats): string {
  const sign = s.lostAbs >= 0 ? "−" : "+";
  return `${sign}${Math.abs(s.lostPct).toFixed(1)}%`;
}

/** Progress (0..1+) toward a first_to_target goal, from a start→current pair. */
function targetProgressFrom(
  start: number,
  current: number,
  c: Challenge,
): number {
  const target = c.target_amount ?? 0;
  if (target <= 0) return 0;
  if (c.target_type === "goal_weight") {
    const denom = start - target;
    if (denom <= 0) return current <= target ? 1 : 0;
    return (start - current) / denom;
  }
  return (start - current) / target; // amount_lost
}

function targetProgress(s: MemberStats, c: Challenge): number {
  return targetProgressFrom(s.start, s.current, c);
}

/** Most recent occurrence of the weigh-in weekday on or before `dateStr`. */
function weekStartOnOrBefore(weighInDay: number, dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const diff = (d.getDay() - weighInDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.toLocaleDateString("en-CA");
}

/**
 * Consistency = number of distinct weigh-in weeks attended (weeks anchored on
 * the challenge's weigh-in day). Logging twice in one week counts once, so you
 * can't game it by weighing in every day.
 */
function weeksAttended(list: WeighIn[], challenge: Challenge): number {
  const weeks = new Set(
    list.map((w) => weekStartOnOrBefore(challenge.weigh_in_day, w.weighed_on)),
  );
  return weeks.size;
}

/** The number used to rank a member for this challenge's winner rule. */
function metricOf(
  s: MemberStats | undefined,
  c: Challenge,
  weeks: number,
): number {
  if (!s) return -Infinity; // no weigh-ins yet → bottom
  switch (c.winner_rule) {
    case "total_lost":
      return s.lostAbs;
    case "most_consistent":
      return weeks;
    case "first_to_target":
      return targetProgress(s, c);
    default:
      return s.lostPct; // percent_lost, last_standing
  }
}

function displayMetric(
  s: MemberStats | undefined,
  c: Challenge,
  weeks: number,
): string {
  if (!s) return "—";
  switch (c.winner_rule) {
    case "total_lost": {
      const sign = s.lostAbs >= 0 ? "−" : "+";
      return `${sign}${fmtWeight(Math.abs(s.lostAbs))} ${c.unit}`;
    }
    case "most_consistent":
      return `${weeks} wk`;
    case "first_to_target":
      return `${Math.round(targetProgress(s, c) * 100)}%`;
    default:
      return pctLabel(s);
  }
}

/** Format a metric gap ("to 1st") in the winner rule's own units. */
export function formatGap(c: Challenge, gap: number): string {
  switch (c.winner_rule) {
    case "total_lost":
      return `${fmtWeight(Math.abs(gap))} ${c.unit}`;
    case "most_consistent":
      return `${Math.abs(gap)} wk`;
    case "first_to_target":
      return `${Math.round(Math.abs(gap) * 100)}%`;
    default:
      return `${Math.abs(gap).toFixed(1)}%`;
  }
}

/**
 * The date a member reached their ranking metric — used to break a tie under
 * the "earliest to best number" rule. For a target race it's the first day
 * they crossed the line; otherwise it's their latest weigh-in.
 */
function achievedOn(
  list: WeighIn[],
  s: MemberStats | undefined,
  c: Challenge,
): string | null {
  if (!s || list.length === 0) return null;
  if (c.winner_rule === "first_to_target") {
    const sorted = [...list].sort((a, b) =>
      a.weighed_on.localeCompare(b.weighed_on),
    );
    const start = sorted[0].weight;
    for (const w of sorted) {
      if (targetProgressFrom(start, w.weight, c) >= 1) return w.weighed_on;
    }
    return null;
  }
  return s.lastWeighedOn;
}

export function buildLeaderboard(
  members: MemberWithProfile[],
  stats: Map<string, MemberStats>,
  challenge: Challenge,
  weighIns: WeighIn[] = [],
): LeaderRow[] {
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA");
  const isActive =
    todayStr >= challenge.start_date && todayStr <= challenge.end_date;
  const weekStart = weekStartOnOrBefore(challenge.weigh_in_day, todayStr);

  // Group weigh-ins per user for consistency + tie-break dates.
  const byUser = new Map<string, WeighIn[]>();
  for (const w of weighIns) {
    const list = byUser.get(w.user_id) ?? [];
    list.push(w);
    byUser.set(w.user_id, list);
  }
  const weeksOf = (uid: string) =>
    challenge.winner_rule === "most_consistent"
      ? weeksAttended(byUser.get(uid) ?? [], challenge)
      : 0;

  const metricFor = (uid: string) =>
    metricOf(stats.get(uid), challenge, weeksOf(uid));

  // Full comparison: primary metric desc, then the challenge's tie-breaker.
  // Returns 0 only when two members are genuinely tied (pot would split).
  const compare = (a: MemberWithProfile, b: MemberWithProfile): number => {
    const diff = metricFor(b.user_id) - metricFor(a.user_id);
    if (diff !== 0) return diff;
    if (challenge.tie_breaker === "earliest_best") {
      const da = achievedOn(byUser.get(a.user_id) ?? [], stats.get(a.user_id), challenge);
      const db = achievedOn(byUser.get(b.user_id) ?? [], stats.get(b.user_id), challenge);
      if (da && db && da !== db) return da.localeCompare(db); // earlier wins
      if (da && !db) return -1;
      if (!da && db) return 1;
    }
    return 0; // "split" (or unbreakable) → truly tied
  };

  const sorted = [...members].sort(compare);
  const leaderMetric = sorted.length ? metricFor(sorted[0].user_id) : 0;

  // Competition ranking: equal (compare === 0) members share a rank number.
  const ranks: number[] = [];
  sorted.forEach((m, i) => {
    ranks[i] = i > 0 && compare(sorted[i - 1], m) === 0 ? ranks[i - 1] : i + 1;
  });
  const rankCounts = new Map<number, number>();
  sorted.forEach((_, i) => {
    rankCounts.set(ranks[i], (rankCounts.get(ranks[i]) ?? 0) + 1);
  });

  return sorted.map((member, i) => {
    const s = stats.get(member.user_id);
    const weeks = weeksOf(member.user_id);
    const metric = metricFor(member.user_id);

    let ringFill = 0;
    if (s) {
      if (challenge.winner_rule === "first_to_target") {
        ringFill = Math.min(Math.max(targetProgress(s, challenge), 0), 1);
      } else if (leaderMetric > 0 && metric > 0) {
        ringFill = Math.min(metric / leaderMetric, 1);
      }
    }

    const missed =
      isActive &&
      weekStart >= challenge.start_date &&
      (!s?.lastWeighedOn || s.lastWeighedOn < weekStart);

    const rank = ranks[i];
    const hasMetric = metric > -Infinity;

    return {
      rank,
      member,
      stats: s,
      metric,
      displayMetric: displayMetric(s, challenge, weeks),
      ringFill,
      isLeader: rank === 1 && hasMetric,
      reachedTarget:
        challenge.winner_rule === "first_to_target" &&
        !!s &&
        targetProgress(s, challenge) >= 1,
      missed,
      tiedForRank: hasMetric && (rankCounts.get(rank) ?? 0) > 1,
    };
  });
}
