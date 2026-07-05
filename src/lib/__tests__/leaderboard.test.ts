import { describe, it, expect } from "vitest";
import { statsByUser } from "../stats";
import {
  buildLeaderboard,
  pctLabel,
  formatGap,
  type MemberWithProfile,
} from "../leaderboard";
import type { Challenge, WeighIn } from "../types";

function challenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: "c1",
    name: "Test",
    created_by: "host",
    buy_in_amount: 100,
    currency: "USD",
    unit: "lb",
    // Finished in the past so `isActive` is false and the `missed` flag stays
    // deterministic regardless of the machine clock.
    start_date: "2020-01-01",
    end_date: "2020-03-01",
    weigh_in_day: 0,
    winner_rule: "percent_lost",
    target_type: null,
    target_amount: null,
    photo_proof: "off",
    tie_breaker: "split",
    join_code: "ABC123",
    created_at: "2020-01-01T00:00:00Z",
    ...overrides,
  };
}

function member(userId: string, name: string): MemberWithProfile {
  return {
    id: `m-${userId}`,
    challenge_id: "c1",
    user_id: userId,
    role: "member",
    has_paid: true,
    starting_weight: null,
    joined_at: "2020-01-01T00:00:00Z",
    profile: {
      id: userId,
      display_name: name,
      avatar_url: null,
      unit: "lb",
      height_cm: null,
      goal_weight: null,
      push_enabled: true,
      weigh_in_reminders: true,
      created_at: "2020-01-01T00:00:00Z",
    },
  };
}

function w(userId: string, weight: number, weighed_on: string): WeighIn {
  return {
    id: crypto.randomUUID(),
    challenge_id: "c1",
    user_id: userId,
    weight,
    photo_url: null,
    weighed_on,
    note: null,
    created_at: `${weighed_on}T12:00:00Z`,
  };
}

describe("buildLeaderboard — percent_lost", () => {
  const c = challenge();
  const members = [member("u1", "Alice"), member("u2", "Bob")];
  const weighIns = [
    w("u1", 200, "2020-01-05"),
    w("u1", 188, "2020-02-20"), // −6%
    w("u2", 200, "2020-01-05"),
    w("u2", 196, "2020-02-20"), // −2%
  ];
  const rows = buildLeaderboard(members, statsByUser(weighIns), c);

  it("ranks the bigger percent loser first", () => {
    expect(rows[0].member.user_id).toBe("u1");
    expect(rows[0].rank).toBe(1);
    expect(rows[0].isLeader).toBe(true);
    expect(rows[1].member.user_id).toBe("u2");
  });

  it("fills the leader's ring fully and others proportionally", () => {
    expect(rows[0].ringFill).toBe(1);
    expect(rows[1].ringFill).toBeCloseTo(2 / 6, 3);
  });

  it("shows the signed percent as the display metric", () => {
    expect(rows[0].displayMetric).toBe("−6.0%");
    expect(rows[1].displayMetric).toBe("−2.0%");
  });
});

describe("buildLeaderboard — total_lost", () => {
  it("ranks by absolute weight lost and shows it in the unit", () => {
    const c = challenge({ winner_rule: "total_lost" });
    const members = [member("u1", "Alice"), member("u2", "Bob")];
    const weighIns = [
      w("u1", 300, "2020-01-05"),
      w("u1", 280, "2020-02-20"), // −20
      w("u2", 200, "2020-01-05"),
      w("u2", 195, "2020-02-20"), // −5
    ];
    const rows = buildLeaderboard(members, statsByUser(weighIns), c);
    expect(rows[0].member.user_id).toBe("u1");
    expect(rows[0].displayMetric).toBe("−20 lb");
  });
});

describe("buildLeaderboard — first_to_target", () => {
  it("clamps ring fill and flags members who reached the target", () => {
    const c = challenge({
      winner_rule: "first_to_target",
      target_type: "amount_lost",
      target_amount: 10,
    });
    const members = [member("u1", "Alice")];
    const weighIns = [w("u1", 200, "2020-01-05"), w("u1", 186, "2020-02-20")]; // −14
    const rows = buildLeaderboard(members, statsByUser(weighIns), c);
    expect(rows[0].reachedTarget).toBe(true);
    expect(rows[0].ringFill).toBe(1);
    expect(rows[0].displayMetric).toBe("140%");
  });
});

describe("buildLeaderboard — members without weigh-ins", () => {
  it("drops them to the bottom with a placeholder metric", () => {
    const c = challenge();
    const members = [member("u1", "Alice"), member("u2", "Bob")];
    const weighIns = [w("u1", 200, "2020-01-05"), w("u1", 190, "2020-02-20")];
    const rows = buildLeaderboard(members, statsByUser(weighIns), c);
    expect(rows[1].member.user_id).toBe("u2");
    expect(rows[1].displayMetric).toBe("—");
    expect(rows[1].isLeader).toBe(false);
  });
});

describe("buildLeaderboard — most_consistent", () => {
  // weigh_in_day 0 = Sunday. These dates span 3 distinct weeks for u1 (one has
  // two entries in the same week) and 2 weeks for u2.
  const c = challenge({ winner_rule: "most_consistent", weigh_in_day: 0 });
  const members = [member("u1", "Alice"), member("u2", "Bob")];
  const weighIns = [
    w("u1", 200, "2020-01-05"), // week A
    w("u1", 199, "2020-01-08"), // still week A (Wed) — must not double-count
    w("u1", 198, "2020-01-12"), // week B
    w("u1", 197, "2020-01-19"), // week C
    w("u2", 220, "2020-01-05"), // week A
    w("u2", 219, "2020-01-12"), // week B
  ];
  const rows = buildLeaderboard(members, statsByUser(weighIns), c, weighIns);

  it("ranks by distinct weeks attended, not raw weigh-in count", () => {
    expect(rows[0].member.user_id).toBe("u1");
    expect(rows[0].metric).toBe(3); // 3 weeks despite 4 weigh-ins
    expect(rows[0].displayMetric).toBe("3 wk");
    expect(rows[1].metric).toBe(2);
  });

  it("does not reward same-week double logging", () => {
    // u1's Jan 5 + Jan 8 are the same Sun–Sat week → one week, not two.
    const alice = rows.find((r) => r.member.user_id === "u1")!;
    expect(alice.metric).toBe(3);
  });
});

describe("buildLeaderboard — tie-breaker", () => {
  const members = [member("u1", "Alice"), member("u2", "Bob")];
  // Both lose exactly 10 lb → identical percent metric.
  const weighIns = [
    w("u1", 200, "2020-01-05"),
    w("u1", 190, "2020-01-20"), // reached −10 on Jan 20
    w("u2", 200, "2020-01-05"),
    w("u2", 190, "2020-02-10"), // reached −10 later, Feb 10
  ];

  it("splits the pot on a tie under 'split' (shared rank + tiedForRank)", () => {
    const c = challenge({ tie_breaker: "split" });
    const rows = buildLeaderboard(members, statsByUser(weighIns), c, weighIns);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(1); // shared
    expect(rows[0].tiedForRank).toBe(true);
    expect(rows[1].tiedForRank).toBe(true);
  });

  it("breaks the tie by earliest achiever under 'earliest_best'", () => {
    const c = challenge({ tie_breaker: "earliest_best" });
    const rows = buildLeaderboard(members, statsByUser(weighIns), c, weighIns);
    expect(rows[0].member.user_id).toBe("u1"); // hit −10 first
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
    expect(rows[0].tiedForRank).toBe(false);
  });
});

describe("pctLabel", () => {
  it("shows loss as negative and gain as positive", () => {
    expect(pctLabel({ lostAbs: 12, lostPct: 5 } as never)).toBe("−5.0%");
    expect(pctLabel({ lostAbs: -3, lostPct: -2 } as never)).toBe("+2.0%");
  });
});

describe("formatGap", () => {
  it("formats the gap in each rule's own units", () => {
    expect(formatGap(challenge({ winner_rule: "percent_lost" }), 1.25)).toBe("1.3%");
    expect(formatGap(challenge({ winner_rule: "total_lost" }), 8)).toBe("8 lb");
    expect(formatGap(challenge({ winner_rule: "first_to_target" }), 0.4)).toBe("40%");
  });
});
