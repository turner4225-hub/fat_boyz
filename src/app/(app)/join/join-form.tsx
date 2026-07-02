"use client";

import { useActionState } from "react";
import { joinByCode, type FormState } from "../challenges/actions";

export function JoinForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    joinByCode,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Join code</span>
        <input
          name="code"
          required
          autoCapitalize="characters"
          placeholder="ABC123"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center font-mono text-lg tracking-widest uppercase outline-none focus:border-brand"
        />
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-black transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join challenge"}
      </button>
    </form>
  );
}
