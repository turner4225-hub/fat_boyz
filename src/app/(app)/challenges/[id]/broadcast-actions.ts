"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push";

export type BroadcastState =
  | { error?: string; ok?: boolean; sent?: number; failed?: number }
  | undefined;

/** Challenge host sends a custom push to all members with notifications on. */
export async function broadcastToMembers(
  _prev: BroadcastState,
  formData: FormData,
): Promise<BroadcastState> {
  const user = await requireUser();
  const challengeId = String(formData.get("challenge_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!challengeId) return { error: "Missing challenge." };
  if (!title) return { error: "Enter a title." };
  if (!body) return { error: "Enter a message." };
  if (title.length > 60) return { error: "Title is too long (60 max)." };
  if (body.length > 200) return { error: "Message is too long (200 max)." };

  const supabase = await createClient();
  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, name, created_by")
    .eq("id", challengeId)
    .single();

  if (!challenge) return { error: "Challenge not found." };
  if (challenge.created_by !== user.id) {
    return { error: "Only the challenge host can send notifications." };
  }

  const { data: members } = await supabase
    .from("challenge_members")
    .select("user_id")
    .eq("challenge_id", challengeId);

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) {
    return { error: "No members to notify." };
  }

  try {
    const { sent, failed } = await sendPushToUsers(userIds, {
      title,
      body,
      url: `/challenges/${challengeId}`,
    });

    if (sent === 0 && failed === 0) {
      return {
        error:
          "Nobody has notifications enabled yet. Tell the crew to turn them on in You → Notifications.",
      };
    }

    revalidatePath(`/challenges/${challengeId}`);
    return { ok: true, sent, failed };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send notifications.";
    return { error: message };
  }
}
