"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logWeighIn, type WeighInState } from "./actions";
import { PhotoInput } from "../../photo-input";

export function WeighInForm({
  challengeId,
  userId,
  unit,
  photoProof,
}: {
  challengeId: string;
  userId: string;
  unit: string;
  photoProof: "off" | "optional" | "required";
}) {
  const [open, setOpen] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<WeighInState, FormData>(
    logWeighIn,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Local date (en-CA formats as YYYY-MM-DD) — avoids the UTC off-by-one.
  const today = new Date().toLocaleDateString("en-CA");

  // Collapse + reset once a weigh-in saves successfully. Depend on the whole
  // `state` object: useActionState returns a fresh object on every submit, so
  // this fires for each successful save, not just the first.
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setPhotoPath(null);
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl bg-brand px-4 py-4 text-base font-extrabold text-black transition hover:bg-brand-strong"
      >
        Log weigh-in
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <input type="hidden" name="challenge_id" value={challengeId} />
      <input type="hidden" name="photo_url" value={photoPath ?? ""} />
      <h3 className="mb-4 font-bold">Log a weigh-in</h3>

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

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium">Note (optional)</span>
        <input
          name="note"
          type="text"
          placeholder="Felt great this week"
          className={inputClass}
        />
      </label>

      {photoProof !== "off" && (
        <div className="mt-4">
          <PhotoInput
            userId={userId}
            onChange={setPhotoPath}
            required={photoProof === "required"}
          />
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Counts toward every challenge you&apos;re in right now.
      </p>

      {state?.error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          disabled={pending || (photoProof === "required" && !photoPath)}
          className="flex-1 rounded-lg bg-brand px-4 py-2.5 font-bold text-black transition hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save weigh-in"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-2.5 font-medium transition hover:bg-background"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-brand";
