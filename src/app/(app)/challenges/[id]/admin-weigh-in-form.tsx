"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { adminLogWeighIn, type WeighInState } from "./actions";
import { PhotoInput } from "../../photo-input";

export function AdminWeighInForm({
  challengeId,
  adminUserId,
  unit,
  members,
  photoProof,
}: {
  challengeId: string;
  adminUserId: string;
  unit: string;
  members: { user_id: string; name: string }[];
  photoProof: "off" | "optional" | "required";
}) {
  const [open, setOpen] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<WeighInState, FormData>(
    adminLogWeighIn,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toLocaleDateString("en-CA");

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
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-background"
      >
        Log for a member
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-xl border border-border bg-background p-4"
    >
      <input type="hidden" name="challenge_id" value={challengeId} />
      <input type="hidden" name="photo_url" value={photoPath ?? ""} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Member</span>
        <select name="target_user_id" required className={inputClass}>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Weight ({unit})</span>
          <input
            name="weight"
            type="number"
            step="0.1"
            min="1"
            required
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

      {photoProof !== "off" && (
        <div className="mt-3">
          <PhotoInput userId={adminUserId} onChange={setPhotoPath} />
        </div>
      )}

      {state?.error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-brand px-4 py-2 font-bold text-black transition hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save weigh-in"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-card"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-brand";
