import { describe, it, expect } from "vitest";
import { formatLeaderboardText } from "../share";

const base = {
  challengeName: "Summer Hard Bodies 26",
  ruleLabel: "% of body weight lost",
  pot: 600,
  currency: "USD",
};

describe("formatLeaderboardText", () => {
  it("renders a shareable standings list with medals for the top three", () => {
    const text = formatLeaderboardText({
      ...base,
      rows: [
        { rank: 1, name: "Dane", metric: "−6.2%" },
        { rank: 2, name: "Chris", metric: "−4.1%" },
        { rank: 3, name: "Turner", metric: "−2.0%" },
        { rank: 4, name: "Jesse", metric: "—" },
      ],
      url: "https://fat-boyz-one.vercel.app",
    });

    expect(text).toBe(
      [
        "🏆 Summer Hard Bodies 26",
        "% of body weight lost",
        "",
        "🥇 Dane  −6.2%",
        "🥈 Chris  −4.1%",
        "🥉 Turner  −2.0%",
        "4. Jesse  —",
        "",
        "💰 Pot: USD 600",
        "https://fat-boyz-one.vercel.app",
      ].join("\n"),
    );
  });

  it("gives tied members the same medal", () => {
    const text = formatLeaderboardText({
      ...base,
      rows: [
        { rank: 1, name: "Dane", metric: "−5.0%" },
        { rank: 1, name: "Chris", metric: "−5.0%" },
      ],
    });
    expect(text).toContain("🥇 Dane");
    expect(text).toContain("🥇 Chris");
  });

  it("never leaks anyone's actual body weight", () => {
    const text = formatLeaderboardText({
      ...base,
      rows: [{ rank: 1, name: "Dane", metric: "−6.2%" }],
    });
    // Only the ranking metric goes out — no start/current weights.
    expect(text).not.toMatch(/\d{3}\s?(lb|kg)/);
  });

  it("handles an empty board and omits the link when there isn't one", () => {
    const text = formatLeaderboardText({ ...base, rows: [] });
    expect(text).toContain("Nobody's on the board yet.");
    expect(text).not.toContain("http");
  });
});
