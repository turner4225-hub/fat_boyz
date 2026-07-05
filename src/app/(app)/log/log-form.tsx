"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { logWeighInEverywhere, type LogState } from "./actions";
import { PhotoInput } from "../photo-input";

export function LogForm({
  userId,
  unit,
  challengeNames,
}: {
  userId: string;
  unit: string;
  challengeNames: string[];
}) {
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<LogState, FormData>(
    logWeighInEverywhere,
    undefined,
  );
  const today = new Date().toLocaleDateString("en-CA");
  const hasChallenges = challengeNames.length > 0;

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-brand/40 bg-brand/5 p-6 text-center">
        <p className="text-lg font-bold text-brand">Logged! ✓</p>
        <p className="mt-1 text-sm text-muted">
          {state.count && state.count > 0
            ? `Counted in ${state.count} ${state.count === 1 ? "challenge" : "challenges"}.`
            : "Saved to your personal weight log."}
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/goals"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-black"
          >
            See your graph
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Weight ({unit})
          </span>
          <input
            name="weight"
            type="number"
            step="0.1"
            min="1"
            required
            autoFocus
            placeholder="240.0"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Date</span>
          <input
            name="weighed_on"
            type="date"
            defaultValue={today}
            max={today}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-4">
        <input type="hidden" name="photo_url" value={photoPath ?? ""} />
        <PhotoInput userId={userId} onChange={setPhotoPath} />
      </div>

      <p className="mt-3 text-xs text-muted">
        {hasChallenges
          ? `Counts toward: ${challengeNames.join(", ")}`
          : "You're not in an active challenge — this saves to your personal weight log."}
      </p>

      {state?.error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-2xl bg-brand px-4 py-4 text-base font-extrabold text-black transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log weigh-in"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-brand";
