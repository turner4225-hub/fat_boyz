"use client";

import { useActionState } from "react";
import {
  broadcastToMembers,
  type BroadcastState,
} from "./broadcast-actions";

export function BroadcastForm({
  challengeId,
  challengeName,
}: {
  challengeId: string;
  challengeName: string;
}) {
  const [state, formAction, pending] = useActionState<BroadcastState, FormData>(
    broadcastToMembers,
    undefined,
  );

  return (
    <div className="mt-8 rounded-2xl border border-gold/30 bg-gold/5 p-5">
      <h2 className="text-lg font-semibold">📣 Send a push notification</h2>
      <p className="mt-1 text-sm text-muted">
        Blast everyone in <b>{challengeName}</b> who has notifications turned
        on. Perfect for trash talk.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="challenge_id" value={challengeId} />

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Title</span>
          <input
            name="title"
            type="text"
            required
            maxLength={60}
            placeholder="The leaderboard just shifted"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Message</span>
          <textarea
            name="body"
            required
            maxLength={200}
            rows={3}
            placeholder="Jeff logged 3 lbs down. Y'all sleeping?"
            className={inputClass}
          />
        </label>

        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        {state?.ok && (
          <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
            Sent to {state.sent} device{state.sent === 1 ? "" : "s"}
            {state.failed && state.failed > 0 ? ` (${state.failed} failed)` : ""}.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-gold px-4 py-2.5 font-bold text-black transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send notification"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-brand";
