import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildTimeline, type RawWeighIn } from "@/lib/personal";
import { bmi } from "@/lib/health";
import { formatDate, fmtWeight } from "@/lib/format";
import { GoalsChart } from "./goals-chart";

export default async function GoalsPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("weigh_ins")
    .select("weight, weighed_on, created_at, challenge:challenges(unit)")
    .eq("user_id", user.id);

  const unit = profile?.unit ?? "lb";
  const timeline = buildTimeline(
    (rows ?? []).map((r) => ({
      weight: r.weight,
      weighed_on: r.weighed_on,
      created_at: r.created_at,
      unit: (r.challenge as unknown as { unit: "lb" | "kg" })?.unit ?? unit,
    })) as RawWeighIn[],
    unit,
  );

  const current = timeline.at(-1)?.weight ?? null;
  const goal = profile?.goal_weight ?? null;
  const toGoal =
    current !== null && goal !== null ? current - goal : null;
  const bmiValue =
    current !== null ? bmi(current, unit, profile?.height_cm ?? null) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Goals</h1>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Current"
          value={current !== null ? `${fmtWeight(current)}` : "—"}
          sub={unit}
        />
        <Stat
          label="Goal"
          value={goal !== null ? `${fmtWeight(goal)}` : "—"}
          sub={goal !== null ? unit : "set in You"}
        />
        <Stat
          label={toGoal !== null && toGoal > 0 ? "To go" : "Status"}
          value={
            toGoal === null
              ? "—"
              : toGoal <= 0
                ? "Hit! 🎉"
                : fmtWeight(toGoal)
          }
          sub={toGoal !== null && toGoal > 0 ? unit : ""}
          highlight={toGoal !== null && toGoal <= 0}
        />
      </div>

      <GoalsChart
        points={timeline}
        unit={unit}
        heightCm={profile?.height_cm ?? null}
        goalWeight={goal}
      />

      {goal === null && (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
          Set a goal weight on the{" "}
          <Link href="/account" className="font-semibold text-brand">
            You
          </Link>{" "}
          page to see your goal line and countdown.
        </p>
      )}

      {/* Full weight log */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          All weigh-ins ({timeline.length})
        </h2>
        {timeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No weigh-ins yet.{" "}
            <Link href="/log" className="font-semibold text-brand">
              Log your first
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {[...timeline].reverse().map((p) => {
              const b = bmi(p.weight, unit, profile?.height_cm ?? null);
              return (
                <li
                  key={p.weighed_on}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <span className="font-semibold">
                    {fmtWeight(p.weight)} {unit}
                  </span>
                  <span className="text-sm text-muted">
                    {b !== null && `BMI ${b.toFixed(1)} · `}
                    {formatDate(p.weighed_on)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {bmiValue !== null && (
        <p className="text-center text-xs text-muted">
          Current BMI {bmiValue.toFixed(1)}
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <p className="text-xs font-semibold text-muted uppercase">{label}</p>
      <p
        className={`mt-1 text-xl font-black ${highlight ? "text-brand" : ""}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
