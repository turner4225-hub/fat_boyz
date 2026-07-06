import type { Challenge } from "./types";

/** A member row with the notification prefs the reminder cares about. */
export interface ReminderMember {
  user_id: string;
  push_enabled: boolean;
  weigh_in_reminders: boolean;
}

/**
 * Who should get a weigh-in-day reminder: members who opted in (push on +
 * reminders on) AND have not already logged their weight for the day. Passing
 * the set of user ids that already logged keeps the "don't nag people who
 * already weighed in" rule in one tested place.
 */
export function reminderRecipients(
  members: ReminderMember[],
  alreadyLoggedUserIds: Iterable<string>,
): string[] {
  const logged = new Set(alreadyLoggedUserIds);
  return members
    .filter(
      (m) =>
        m.push_enabled && m.weigh_in_reminders && !logged.has(m.user_id),
    )
    .map((m) => m.user_id);
}

/**
 * The push title/body announcing a finished challenge's winner(s). Returns null
 * when there's no winner to announce (e.g. nobody logged a weigh-in).
 */
export function winnerAnnouncement(
  challenge: Pick<Challenge, "name" | "currency" | "buy_in_amount">,
  winnerNames: string[],
  memberCount: number,
): { title: string; body: string } | null {
  if (winnerNames.length === 0) return null;
  const pot = (challenge.buy_in_amount ?? 0) * memberCount;
  const potStr = `${challenge.currency} ${pot.toLocaleString()}`;
  const body =
    winnerNames.length > 1
      ? `${winnerNames.join(" & ")} split the ${potStr} pot.`
      : `${winnerNames[0]} takes the ${potStr} pot! 💰`;
  return { title: `🏆 ${challenge.name} — winner!`, body };
}
