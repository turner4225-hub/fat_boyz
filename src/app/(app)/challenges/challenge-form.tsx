"use client";

import { useActionState, useState } from "react";
import type { FormState } from "./actions";
import type { Challenge } from "@/lib/types";

const WINNER_RULES = [
  { value: "percent_lost", label: "% of body weight lost (classic)" },
  { value: "total_lost", label: "Most weight lost" },
  { value: "first_to_target", label: "First to hit a target" },
  { value: "most_consistent", label: "Most consistent" },
  { value: "last_standing", label: "Last one standing" },
];

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type ServerAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

export function ChallengeForm({
  action,
  defaults,
  challengeId,
  submitLabel,
  pendingLabel,
}: {
  action: ServerAction;
  defaults?: Partial<Challenge>;
  challengeId?: string;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined,
  );
  const [winnerRule, setWinnerRule] = useState(
    defaults?.winner_rule ?? "percent_lost",
  );

  return (
    <form action={formAction} className="space-y-6">
      {challengeId && (
        <input type="hidden" name="challenge_id" value={challengeId} />
      )}

      <Section title="The basics">
        <Field label="Challenge name">
          <input
            name="name"
            required
            defaultValue={defaults?.name ?? ""}
            placeholder="New Year New Me 2026"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Buy-in">
            <div className="flex gap-2">
              <select
                name="currency"
                defaultValue={defaults?.currency ?? "USD"}
                className={inputClass}
              >
                <option value="USD">USD $</option>
                <option value="CAD">CAD $</option>
                <option value="EUR">EUR €</option>
                <option value="GBP">GBP £</option>
              </select>
              <input
                name="buy_in_amount"
                type="number"
                min="0"
                step="1"
                defaultValue={defaults?.buy_in_amount ?? 100}
                className={inputClass}
              />
            </div>
          </Field>
          <Field label="Weight unit">
            <select
              name="unit"
              defaultValue={defaults?.unit ?? "lb"}
              className={inputClass}
            >
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Dates & weigh-ins">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date">
            <input
              name="start_date"
              type="date"
              required
              defaultValue={defaults?.start_date ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="End date">
            <input
              name="end_date"
              type="date"
              required
              defaultValue={defaults?.end_date ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Weigh-in day">
          <select
            name="weigh_in_day"
            defaultValue={String(defaults?.weigh_in_day ?? 0)}
            className={inputClass}
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <p className={hintClass}>
            Everyone gets a reminder on this day each week.
          </p>
        </Field>
      </Section>

      <Section title="Rules">
        <Field label="How the winner is decided">
          <select
            name="winner_rule"
            value={winnerRule}
            onChange={(e) =>
              setWinnerRule(e.target.value as Challenge["winner_rule"])
            }
            className={inputClass}
          >
            {WINNER_RULES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        {winnerRule === "first_to_target" && (
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-background p-4">
            <Field label="Target is">
              <select
                name="target_type"
                defaultValue={defaults?.target_type ?? "amount_lost"}
                className={inputClass}
              >
                <option value="amount_lost">Amount to lose</option>
                <option value="goal_weight">A goal weight</option>
              </select>
            </Field>
            <Field label="Target number">
              <input
                name="target_amount"
                type="number"
                min="1"
                step="0.1"
                defaultValue={defaults?.target_amount ?? ""}
                placeholder="15"
                className={inputClass}
              />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Scale photo proof">
            <select
              name="photo_proof"
              defaultValue={defaults?.photo_proof ?? "optional"}
              className={inputClass}
            >
              <option value="off">Off — trust based</option>
              <option value="optional">Optional</option>
              <option value="required">Required for each weigh-in</option>
            </select>
          </Field>
          <Field label="If there's a tie">
            <select
              name="tie_breaker"
              defaultValue={defaults?.tie_breaker ?? "split"}
              className={inputClass}
            >
              <option value="split">Split the pot</option>
              <option value="earliest_best">Earliest to best number</option>
            </select>
          </Field>
        </div>
      </Section>

      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-black transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-brand";
const hintClass = "mt-1 text-xs text-muted";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold text-brand">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

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
