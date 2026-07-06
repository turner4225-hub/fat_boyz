import { describe, it, expect } from "vitest";
import {
  eligibleChallenges,
  planWeighIns,
  type ActiveChallenge,
  type WeighInInput,
} from "../weigh-ins";

const lbChallenge = (
  id: string,
  start: string,
  end: string,
  unit: "lb" | "kg" = "lb",
): ActiveChallenge => ({ id, unit, start_date: start, end_date: end });

const input = (over: Partial<WeighInInput> = {}): WeighInInput => ({
  userId: "u1",
  weight: 200,
  sourceUnit: "lb",
  weighedOn: "2026-02-01",
  photoUrl: null,
  note: null,
  ...over,
});

describe("eligibleChallenges", () => {
  const today = "2026-02-01";
  const all = [
    lbChallenge("active", "2026-01-01", "2026-03-01"),
    lbChallenge("ended", "2025-01-01", "2025-03-01"),
    lbChallenge("upcoming", "2026-05-01", "2026-07-01"),
  ];

  it("keeps only running challenges that had already started by the weigh-in date", () => {
    const got = eligibleChallenges(all, "2026-02-01", today).map((c) => c.id);
    expect(got).toEqual(["active"]);
  });

  it("excludes a challenge from a backdated weigh-in before it started", () => {
    // Weighing in for Dec 2025, before "active" began on Jan 1 2026.
    const got = eligibleChallenges(all, "2025-12-15", today).map((c) => c.id);
    expect(got).toEqual([]);
  });
});

describe("planWeighIns", () => {
  it("writes one row per target challenge, converting into each unit", () => {
    const targets = [
      lbChallenge("a", "2026-01-01", "2026-03-01", "lb"),
      lbChallenge("b", "2026-01-01", "2026-03-01", "kg"),
    ];
    const rows = planWeighIns(targets, input({ weight: 220.462, sourceUnit: "lb" }));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ challenge_id: "a", weight: 220.46 });
    // 220.462 lb ≈ 100 kg
    expect(rows[1].challenge_id).toBe("b");
    expect(rows[1].weight).toBeCloseTo(100, 1);
  });

  it("propagates the same photo and note to every challenge", () => {
    const targets = [
      lbChallenge("a", "2026-01-01", "2026-03-01"),
      lbChallenge("b", "2026-01-01", "2026-03-01"),
    ];
    const rows = planWeighIns(
      targets,
      input({ photoUrl: "u1/pic.jpg", note: "leg day" }),
    );
    expect(rows.every((r) => r.photo_url === "u1/pic.jpg")).toBe(true);
    expect(rows.every((r) => r.note === "leg day")).toBe(true);
  });

  it("falls back to a single personal row (no conversion) with no targets", () => {
    const rows = planWeighIns([], input({ weight: 185, sourceUnit: "kg" }));
    expect(rows).toEqual([
      {
        challenge_id: null,
        user_id: "u1",
        weight: 185,
        weighed_on: "2026-02-01",
        photo_url: null,
        note: null,
      },
    ]);
  });
});
