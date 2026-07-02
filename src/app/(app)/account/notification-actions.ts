"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PushSubscriptionPayload } from "@/lib/push-client";

export type NotificationState = { error?: string; ok?: boolean } | undefined;

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
