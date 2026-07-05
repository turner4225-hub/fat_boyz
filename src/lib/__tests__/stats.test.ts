import { describe, it, expect } from "vitest";
import { statsByUser } from "../stats";
import type { WeighIn } from "../types";

function w(partial: Partial<WeighIn> & Pick<WeighIn, "user_id" | "weight" | "weighed_on">): WeighIn {
  return {
    id: partial.id ?? crypto.randomUUID(),
    challenge_id: partial.challenge_id ?? "c1",
    photo_url: partial.photo_url ?? null,
    note: partial.note ?? null,
    created_at: partial.created_at ?? `${partial.weighed_on}T12:00:00Z`,
    ...partial,
  };
}

describe("statsByUser", () => {
  it("derives start, current, loss and percent from a user's weigh-ins", () => {
    const rows: WeighIn[] = [
      w({ user_id: "u1", weight: 240, weighed_on: "2026-01-01" }),
      w({ user_id: "u1", weight: 232, weighed_on: "2026-01-15" }),
      w({ user_id: "u1", weight: 226, weighed_on: "2026-02-01" }),
    ];
    const s = statsByUser(rows).get("u1")!;
    expect(s.start).toBe(240);
    expect(s.current).toBe(226);
    expect(s.count).toBe(3);
    expect(s.lostAbs).toBe(14);
    expect(s.lostPct).toBeCloseTo(5.833, 2);
    expect(s.lastWeighedOn).toBe("2026-02-01");
  });

  it("orders out-of-order rows chronologically before picking start/current", () => {
    const rows: WeighIn[] = [
      w({ user_id: "u1", weight: 226, weighed_on: "2026-02-01" }),
      w({ user_id: "u1", weight: 240, weighed_on: "2026-01-01" }),
    ];
    const s = statsByUser(rows).get("u1")!;
    expect(s.start).toBe(240);
    expect(s.current).toBe(226);
  });

  it("breaks a same-date tie by created_at insertion order", () => {
    const rows: WeighIn[] = [
      w({ user_id: "u1", weight: 230, weighed_on: "2026-01-01", created_at: "2026-01-01T08:00:00Z" }),
      w({ user_id: "u1", weight: 228, weighed_on: "2026-01-01", created_at: "2026-01-01T20:00:00Z" }),
    ];
    const s = statsByUser(rows).get("u1")!;
    expect(s.start).toBe(230);
    expect(s.current).toBe(228);
  });

  it("separates stats per user", () => {
    const rows: WeighIn[] = [
      w({ user_id: "u1", weight: 200, weighed_on: "2026-01-01" }),
      w({ user_id: "u2", weight: 300, weighed_on: "2026-01-01" }),
    ];
    const map = statsByUser(rows);
    expect(map.get("u1")!.start).toBe(200);
    expect(map.get("u2")!.start).toBe(300);
  });

  it("reports a gain as a negative loss", () => {
    const rows: WeighIn[] = [
      w({ user_id: "u1", weight: 200, weighed_on: "2026-01-01" }),
      w({ user_id: "u1", weight: 205, weighed_on: "2026-01-08" }),
    ];
    const s = statsByUser(rows).get("u1")!;
    expect(s.lostAbs).toBe(-5);
    expect(s.lostPct).toBeCloseTo(-2.5, 5);
  });
});
