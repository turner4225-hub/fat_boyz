"use client";

import { useEffect, useState, useTransition } from "react";
import {
  isPushSupported,
  isStandalonePwa,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";
import {
  savePushSubscription,
  removePushSubscription,
  updateNotificationPrefs,
} from "./notification-actions";

type Props = {
  vapidPublicKey: string | null;
  weighInReminders: boolean;
  hasSubscription: boolean;
};

export function NotificationSettings({
  vapidPublicKey,
  weighInReminders,
  hasSubscription,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [subscribed, setSubscribed] = useState(hasSubscription);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSupported(isPushSupported());
    setStandalone(isStandalonePwa());
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  async function enablePush() {
    setError(null);
    if (!vapidPublicKey) {
      setError("Push is not configured on the server yet.");
      return;
    }
    if (!standalone) {
      setError("Add Fat Boyz to your Home Screen first, then open it from there.");
      return;
    }

    startTransition(async () => {
      try {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") {
          setError("Notification permission denied.");
          return;
        }
        const sub = await subscribeToPush(vapidPublicKey);
        const result = await savePushSubscription(sub);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setSubscribed(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not enable notifications.");
      }
    });
  }

  async function disablePush() {
    setError(null);
    startTransition(async () => {
      try {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await removePushSubscription(endpoint);
        setSubscribed(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not disable notifications.");
      }
    });
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">🔔 Notifications</h2>
        <p className="mt-1 text-sm text-muted">
          Your browser doesn&apos;t support push notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-bold">🔔 Notifications</h2>
      <p className="mt-1 text-sm text-muted">
        Get weigh-in reminders and messages from your challenge host.
      </p>

      {!standalone && (
        <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold">
          On iPhone: add Fat Boyz to your Home Screen first, then open the app
          from that icon to enable notifications.
        </p>
      )}

      {subscribed ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-brand">
            ✓ Notifications enabled
            {permission === "granted" ? "" : " (check system settings)"}
          </p>

          <form action={updateNotificationPrefs} className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="weigh_in_reminders"
                defaultChecked={weighInReminders}
                className="h-4 w-4 accent-brand"
              />
              Weigh-in day reminders
            </label>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-background"
            >
              Save
            </button>
          </form>

          <button
            type="button"
            onClick={disablePush}
            disabled={pending}
            className="text-sm text-muted underline transition hover:text-foreground disabled:opacity-60"
          >
            Turn off notifications
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={enablePush}
          disabled={pending || !vapidPublicKey}
          className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 font-bold text-black transition hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? "Enabling…" : "Enable notifications"}
        </button>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
