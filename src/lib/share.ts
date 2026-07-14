/** One row of the shareable leaderboard summary. */
export interface ShareRow {
  rank: number;
  name: string;
  metric: string; // already formatted, e.g. "−6.0%" or "—"
}

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}.`;
}

/**
 * Plain-text leaderboard for sharing into Messages/WhatsApp/etc.
 *
 * Deliberately shares standings only (rank, name, the ranking metric) and not
 * anyone's actual start/current body weight — a text can travel outside the
 * crew, and those numbers are the sensitive part.
 */
export function formatLeaderboardText(input: {
  challengeName: string;
  ruleLabel: string;
  rows: ShareRow[];
  pot: number;
  currency: string;
  url?: string;
}): string {
  const lines = [`🏆 ${input.challengeName}`, input.ruleLabel, ""];

  if (input.rows.length === 0) {
    lines.push("Nobody's on the board yet.");
  } else {
    for (const r of input.rows) {
      lines.push(`${medal(r.rank)} ${r.name}  ${r.metric}`);
    }
  }

  lines.push("", `💰 Pot: ${input.currency} ${input.pot.toLocaleString()}`);
  if (input.url) lines.push(input.url);

  return lines.join("\n");
}
