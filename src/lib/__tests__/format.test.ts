import { describe, it, expect } from "vitest";
import { formatDate, fmtWeight } from "../format";

describe("formatDate", () => {
  it("renders the stored day, not a UTC-shifted one", () => {
    // The bug this guards against: new Date('2026-07-06') parses as UTC
    // midnight and renders as Jul 5 in any timezone behind UTC. Appending a
    // local time forces local parsing, so the day must match the input.
    const local = new Date("2026-07-06T00:00:00");
    expect(formatDate("2026-07-06")).toBe(local.toLocaleDateString());
    expect(new Date("2026-07-06T00:00:00").getDate()).toBe(6);
  });
});

describe("fmtWeight", () => {
  it("drops a trailing .0 but keeps real decimals", () => {
    expect(fmtWeight(240)).toBe("240");
    expect(fmtWeight(240.0)).toBe("240");
    expect(fmtWeight(239.6)).toBe("239.6");
    expect(fmtWeight(0)).toBe("0");
  });
});
