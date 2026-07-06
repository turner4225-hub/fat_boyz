import { describe, it, expect } from "vitest";
import {
  reminderRecipients,
  winnerAnnouncement,
  type ReminderMember,
} from "../notify";
import { statsByUser } from "../stats";
import { buildLeaderboard, type MemberWithProfile } from "../leaderboard";
import type { Challenge, WeighIn } from "../types";

const member = (
  user_id: string,
  over: Partial<ReminderMember> = {},
): ReminderMember => ({
  user_id,
  push_enabled: true,
  weigh_in_reminders: true,
  ...over,
});

describe("reminderRecipients", () => {
  it("skips members who already logged their weight", () => {
    const members = [member("a"), member("b"), member("c")];
    const got = reminderRecipients(members, ["b"]);
    expect(got).toEqual(["a", "c"]);
  });

  it("skips members who turned push or reminders off", () => {
    const members = [
      member("a", { push_enabled: false }),
      member("b", { weigh_in_reminders: false }),
      member("c"),
    ];
    expect(reminderRecipients(members, [])).toEqual(["c"]);
  });

  it("returns nobody when everyone has already logged", () => {
    const members = [member("a"), member("b")];
    expect(reminderRecipients(members, ["a", "b"])).toEqual([]);
  });
});

describe("winnerAnnouncement", () => {
  const challenge = { name: "Summer Cut", currency: "USD", buy_in_amount: 100 };

  it("announces a single winner taking the whole pot", () => {
    const msg = winnerAnnouncement(challenge, ["Dane"], 6);
    expect(msg).not.toBeNull();
    expect(msg!.title).toBe("🏆 Summer Cut — winner!");
    expect(msg!.body).toContain("Dane takes the USD 600 pot");
  });

  it("announces a split pot for tied winners", () => {
    const msg = winnerAnnouncement(challenge, ["Dane", "Chris"], 6);
    expect(msg!.body).toBe("Dane & Chris split the USD 600 pot.");
  });

  it("returns null when there is no winner to announce", () => {
    expect(winnerAnnouncement(challenge, [], 6)).toBeNull();
  });
});

// Mirrors the exact pipeline sendWinnerAnnouncements() runs: leaderboard →
// winner name(s) → announcement message. (The DB fetch and push transport are
// covered elsewhere / already proven in prod.)
describe("winner announcement pipeline", () => {
  const finished: Challenge = {
    id: "c1",
    name: "Summer Cut",
    created_by: "host",
    buy_in_amount: 100,
    currency: "USD",
    unit: "lb",
    start_date: "2026-01-01",
    end_date: "2026-03-01",
    weigh_in_day: 0,
    winner_rule: "percent_lost",
    target_type: null,
    target_amount: null,
    photo_proof: "off",
    tie_breaker: "split",
    join_code: "ABC123",
    created_at: "2026-01-01T00:00:00Z",
  };

  const member = (uid: string, name: string): MemberWithProfile => ({
    id: `m-${uid}`,
    challenge_id: "c1",
    user_id: uid,
    role: "member",
    has_paid: true,
    starting_weight: null,
    joined_at: "2026-01-01T00:00:00Z",
    profile: {
      id: uid,
      display_name: name,
      avatar_url: null,
      unit: "lb",
      height_cm: null,
      goal_weight: null,
      push_enabled: true,
      weigh_in_reminders: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  });

  const w = (uid: string, weight: number, on: string): WeighIn => ({
    id: crypto.randomUUID(),
    challenge_id: "c1",
    user_id: uid,
    weight,
    photo_url: null,
    weighed_on: on,
    note: null,
    created_at: `${on}T12:00:00Z`,
  });

  function announce(members: MemberWithProfile[], weighIns: WeighIn[]) {
    const rows = buildLeaderboard(members, statsByUser(weighIns), finished, weighIns);
    const names = rows
      .filter((r) => r.isLeader)
      .map((r) => r.member.profile?.display_name ?? "Member");
    return winnerAnnouncement(finished, names, members.length);
  }

  it("announces the biggest percent loser as the winner", () => {
    const members = [member("u1", "Dane"), member("u2", "Chris")];
    const weighIns = [
      w("u1", 200, "2026-01-05"),
      w("u1", 180, "2026-02-20"), // −10%
      w("u2", 200, "2026-01-05"),
      w("u2", 196, "2026-02-20"), // −2%
    ];
    const msg = announce(members, weighIns);
    expect(msg!.body).toBe("Dane takes the USD 200 pot! 💰");
  });

  it("splits the pot when two members tie", () => {
    const members = [member("u1", "Dane"), member("u2", "Chris")];
    const weighIns = [
      w("u1", 200, "2026-01-05"),
      w("u1", 190, "2026-02-20"), // −5%
      w("u2", 200, "2026-01-05"),
      w("u2", 190, "2026-02-20"), // −5%
    ];
    const msg = announce(members, weighIns);
    expect(msg!.body).toBe("Dane & Chris split the USD 200 pot.");
  });

  it("stays silent when nobody weighed in", () => {
    const members = [member("u1", "Dane"), member("u2", "Chris")];
    expect(announce(members, [])).toBeNull();
  });
});
