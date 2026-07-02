import type { Challenge, ChallengeMember, Profile } from "./types";
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

/** Progress (0..1+) toward a first_to_target goal. */
function targetProgress(s: MemberStats, c: Challenge): number {
  const target = c.target_amount ?? 0;
  if (target <= 0) return 0;
  if (c.target_type === "goal_weight") {
    const denom = s.start - target;
    if (denom <= 0) return s.current <= target ? 1 : 0;
    return (s.start - s.current) / denom;
  }
  return s.lostAbs / target; // amount_lost
}

/** The number used to rank a member for this challenge's winner rule. */
function metricOf(s: MemberStats | undefined, c: Challenge): number {
  if (!s) return -Infinity; // no weigh-ins yet → bottom
  switch (c.winner_rule) {
    case "total_lost":
      return s.lostAbs;
    case "most_consistent":
      return s.count;
    case "first_to_target":
      return targetProgress(s, c);
    default:
      return s.lostPct; // percent_lost, last_standing
  }
}

function displayMetric(s: MemberStats | undefined, c: Challenge): string {
  if (!s) return "—";
  switch (c.winner_rule) {
    case "total_lost": {
      const sign = s.lostAbs >= 0 ? "−" : "+";
      return `${sign}${fmtWeight(Math.abs(s.lostAbs))} ${c.unit}`;
    }
    case "most_consistent":
      return `${s.count}`;
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
      return `${Math.abs(gap)}`;
    case "first_to_target":
      return `${Math.round(Math.abs(gap) * 100)}%`;
    default:
      return `${Math.abs(gap).toFixed(1)}%`;
  }
}

/** Most recent occurrence of the weigh-in weekday on or before `today`. */
function currentWeekStart(weighInDay: number, today: Date): string {
  const d = new Date(today);
  const diff = (d.getDay() - weighInDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.toLocaleDateString("en-CA");
}

export function buildLeaderboard(
  members: MemberWithProfile[],
  stats: Map<string, MemberStats>,
  challenge: Challenge,
): LeaderRow[] {
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA");
  const isActive =
    todayStr >= challenge.start_date && todayStr <= challenge.end_date;
  const weekStart = currentWeekStart(challenge.weigh_in_day, today);

  // Sort by metric desc; members without weigh-ins fall to the bottom.
  const sorted = [...members].sort(
    (a, b) =>
      metricOf(stats.get(b.user_id), challenge) -
      metricOf(stats.get(a.user_id), challenge),
  );

  const leaderMetric = sorted.length
    ? metricOf(stats.get(sorted[0].user_id), challenge)
    : 0;

  return sorted.map((member, i) => {
    const s = stats.get(member.user_id);
    const metric = metricOf(s, challenge);

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

    return {
      rank: i + 1,
      member,
      stats: s,
      metric,
      displayMetric: displayMetric(s, challenge),
      ringFill,
      isLeader: i === 0 && !!s && metric > -Infinity,
      reachedTarget:
        challenge.winner_rule === "first_to_target" &&
        !!s &&
        targetProgress(s, challenge) >= 1,
      missed,
    };
  });
}
