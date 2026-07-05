import { describe, it, expect } from "vitest";
import { buildTimeline, type RawWeighIn } from "../personal";

describe("buildTimeline", () => {
  it("sorts points by date ascending", () => {
    const rows: RawWeighIn[] = [
      { weight: 226, weighed_on: "2026-02-01", created_at: "2026-02-01T12:00:00Z", unit: "lb" },
      { weight: 240, weighed_on: "2026-01-01", created_at: "2026-01-01T12:00:00Z", unit: "lb" },
    ];
    const t = buildTimeline(rows, "lb");
    expect(t.map((p) => p.weighed_on)).toEqual(["2026-01-01", "2026-02-01"]);
  });

  it("dedups a shared date, keeping the most recently recorded row", () => {
    const rows: RawWeighIn[] = [
      { weight: 230, weighed_on: "2026-01-01", created_at: "2026-01-01T08:00:00Z", unit: "lb" },
      { weight: 228, weighed_on: "2026-01-01", created_at: "2026-01-01T20:00:00Z", unit: "lb" },
    ];
    const t = buildTimeline(rows, "lb");
    expect(t).toHaveLength(1);
    expect(t[0].weight).toBe(228);
  });

  it("converts each row into the requested display unit", () => {
    const rows: RawWeighIn[] = [
      { weight: 100, weighed_on: "2026-01-01", created_at: "2026-01-01T12:00:00Z", unit: "kg" },
    ];
    const t = buildTimeline(rows, "lb");
    expect(t[0].weight).toBeCloseTo(220.462, 2);
  });
});
