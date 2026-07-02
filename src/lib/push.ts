import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
};

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@fatboyz.app";
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys not configured — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

async function sendOne(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<"sent" | "expired"> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
    return "sent";
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "expired";
    throw err;
  }
}

async function pruneExpired(ids: string[]) {
  if (ids.length === 0) return;
  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().in("id", ids);
}

/** Send a push notification to specific users (all their devices). */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (userIds.length === 0) return { sent: 0, failed: 0 };

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .in("user_id", userIds);

  if (error) throw new Error(error.message);
  if (!subs?.length) return { sent: 0, failed: 0 };

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, push_enabled")
    .in("id", userIds);

  const enabled = new Set(
    (profiles ?? []).filter((p) => p.push_enabled).map((p) => p.id),
  );
  const active = (subs as StoredSubscription[]).filter((s) =>
    enabled.has(s.user_id),
  );

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  for (const sub of active) {
    try {
      const result = await sendOne(sub, payload);
      if (result === "sent") sent++;
      else expired.push(sub.id);
    } catch {
      failed++;
    }
  }

  await pruneExpired(expired);
  return { sent, failed };
}

/** Send weigh-in day reminders for active challenges. */
export async function sendWeighInReminders(): Promise<{
  sent: number;
  challenges: number;
}> {
  const admin = createAdminClient();
  const today = new Date().toLocaleDateString("en-CA");
  const dayOfWeek = new Date().getDay(); // 0 = Sunday, matches weigh_in_day

  const { data: challenges } = await admin
    .from("challenges")
    .select("id, name, weigh_in_day, start_date, end_date")
    .eq("weigh_in_day", dayOfWeek)
    .lte("start_date", today)
    .gte("end_date", today);

  if (!challenges?.length) return { sent: 0, challenges: 0 };

  let totalSent = 0;

  for (const c of challenges) {
    const { data: members } = await admin
      .from("challenge_members")
      .select("user_id, profile:profiles(push_enabled, weigh_in_reminders)")
      .eq("challenge_id", c.id);

    const memberIds = (members ?? [])
      .filter((m) => {
        const p = m.profile as unknown as {
          push_enabled: boolean;
          weigh_in_reminders: boolean;
        } | null;
        return p?.push_enabled && p?.weigh_in_reminders;
      })
      .map((m) => m.user_id);

    if (memberIds.length === 0) continue;

    const { data: loggedToday } = await admin
      .from("weigh_ins")
      .select("user_id")
      .eq("challenge_id", c.id)
      .eq("weighed_on", today);

    const logged = new Set((loggedToday ?? []).map((w) => w.user_id));
    const needReminder = memberIds.filter((id) => !logged.has(id));
    if (needReminder.length === 0) continue;

    const { sent } = await sendPushToUsers(needReminder, {
      title: `Weigh-in day — ${c.name}`,
      body: "Log your weight before the crew leaves you behind.",
      url: `/challenges/${c.id}`,
    });
    totalSent += sent;
  }

  return { sent: totalSent, challenges: challenges.length };
}
