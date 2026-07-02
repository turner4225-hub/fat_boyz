"use client";

import { useActionState, useState } from "react";
import type { Profile } from "@/lib/types";
import { cmToFeetInches } from "@/lib/health";
import { updateProfile, type ProfileState } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    undefined,
  );
  const [unit, setUnit] = useState<Profile["unit"]>(profile.unit ?? "lb");

  const ftIn = profile.height_cm
    ? cmToFeetInches(profile.height_cm)
    : { feet: "", inches: "" };

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="font-bold">Profile</h2>

      <Field label="Display name">
        <input
          name="display_name"
          required
          defaultValue={profile.display_name}
          className={inputClass}
        />
      </Field>

      <Field label="Units">
        <select
          name="unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value as Profile["unit"])}
          className={inputClass}
        >
          <option value="lb">Pounds / feet-inches</option>
          <option value="kg">Kilograms / cm</option>
        </select>
      </Field>

      <Field label="Height">
        {unit === "kg" ? (
          <input
            name="height_cm"
            type="number"
            step="0.1"
            min="1"
            defaultValue={profile.height_cm ?? ""}
            placeholder="cm"
            className={inputClass}
          />
        ) : (
          <div className="flex gap-2">
            <input
              name="height_ft"
              type="number"
              min="0"
              max="9"
              defaultValue={ftIn.feet}
              placeholder="ft"
              className={inputClass}
            />
            <input
              name="height_in"
              type="number"
              min="0"
              max="11"
              defaultValue={ftIn.inches}
              placeholder="in"
              className={inputClass}
            />
          </div>
        )}
      </Field>

      <Field label={`Goal weight (${unit})`}>
        <input
          name="goal_weight"
          type="number"
          step="0.1"
          min="1"
          defaultValue={profile.goal_weight ?? ""}
          placeholder="Optional"
          className={inputClass}
        />
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-bold text-black transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-brand";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
