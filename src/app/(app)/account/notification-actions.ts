"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push";
import type { PushSubscriptionPayload } from "@/lib/push-client";

export type NotificationState = { error?: string; ok?: boolean } | undefined;

/** Send a test push to the current user's own devices (verifies the setup). */
export async function sendTestNotification(): Promise<NotificationState> {
  const user = await requireUser();
  if (
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  ) {
    return { error: "Push isn't set up on the server yet (VAPID keys missing)." };
  }
  try {
    const { sent } = await sendPushToUsers([user.id], {
      title: "Fat Boyz test 🍩",
      body: "Your notifications are working!",
      url: "/goals",
    });
    if (sent === 0) {
      return {
        error:
          "Couldn't reach this device. Turn notifications off and on again, then retry.",
      };
    }
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not send test." };
  }
}

export async function savePushSubscription(
  sub: PushSubscriptionPayload,
): Promise<NotificationState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) return { error: error.message };

  await supabase
    .from("profiles")
    .update({ push_enabled: true })
    .eq("id", user.id);

  revalidatePath("/account");
  return { ok: true };
}

export async function removePushSubscription(
  endpoint: string,
): Promise<NotificationState> {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  revalidatePath("/account");
  return { ok: true };
}

export async function updateNotificationPrefs(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const weighInReminders = formData.get("weigh_in_reminders") === "on";

  const { error } = await supabase
    .from("profiles")
    .update({ weigh_in_reminders: weighInReminders })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/account");
}
