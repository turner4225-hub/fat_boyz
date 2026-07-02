"use client";

import { useState } from "react";
import type { WeightUnit } from "@/lib/types";
import { bmi } from "@/lib/health";
import type { TimelinePoint } from "@/lib/personal";

export function GoalsChart({
  points,
  unit,
  heightCm,
  goalWeight,
}: {
  points: TimelinePoint[];
  unit: WeightUnit;
  heightCm: number | null;
  goalWeight: number | null;
}) {
  const canBmi = !!heightCm;
  const [mode, setMode] = useState<"weight" | "bmi">("weight");
  const showBmi = mode === "bmi" && canBmi;

  // Map each point to the value for the active mode.
  const series = points
    .map((p) => {
      const v = showBmi ? bmi(p.weight, unit, heightCm) : p.weight;
      return v === null ? null : { date: p.weighed_on, value: v };
    })
    .filter((x): x is { date: string; value: number } => x !== null);

  const goalValue =
    goalWeight == null
      ? null
      : showBmi
        ? bmi(goalWeight, unit, heightCm)
        : goalWeight;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">
          {showBmi ? "BMI over time" : "Weight over time"}
        </h2>
        {canBmi && (
          <div className="flex rounded-lg border border-border p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("weight")}
              className={`rounded-md px-2.5 py-1 ${mode === "weight" ? "bg-brand text-black" : "text-muted"}`}
            >
              Weight
            </button>
            <button
              type="button"
              onClick={() => setMode("bmi")}
              className={`rounded-md px-2.5 py-1 ${mode === "bmi" ? "bg-brand text-black" : "text-muted"}`}
            >
              BMI
            </button>
          </div>
        )}
      </div>

      {series.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No weigh-ins yet — log one to start your graph.
        </p>
      ) : (
        <Chart
          series={series}
          goal={goalValue}
          suffix={showBmi ? "" : ` ${unit}`}
        />
      )}
    </div>
  );
}

function Chart({
  series,
  goal,
  suffix,
}: {
  series: { date: string; value: number }[];
  goal: number | null;
  suffix: string;
}) {
  const W = 340;
  const H = 200;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const values = series.map((s) => s.value);
  const times = series.map((s) => new Date(`${s.date}T00:00:00`).getTime());
  const withGoal = goal == null ? values : [...values, goal];
  let yMin = Math.min(...withGoal);
  let yMax = Math.max(...withGoal);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const pad = (yMax - yMin) * 0.1;
  yMin -= pad;
  yMax += pad;

  const tMin = Math.min(...times);
  const tMax = Math.max(...times);

  const x = (t: number) =>
    tMax === tMin ? padL + plotW / 2 : padL + ((t - tMin) / (tMax - tMin)) * plotW;
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const pts = series.map((s, i) => ({
    x: x(times[i]),
    y: y(s.value),
    value: s.value,
    date: s.date,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const dateLabel = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {/* y-axis gridlines + labels */}
      {[yMax, (yMax + yMin) / 2, yMin].map((v, i) => {
        const yy = y(v);
        return (
          <g key={i}>
            <line
              x1={padL}
              y1={yy}
              x2={W - padR}
              y2={yy}
              stroke="#2a2a2e"
              strokeWidth="1"
            />
            <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="#8e8e93">
              {fmt(v)}
            </text>
          </g>
        );
      })}

      {/* goal line */}
      {goal != null && goal >= yMin && goal <= yMax && (
        <g>
          <line
            x1={padL}
            y1={y(goal)}
            x2={W - padR}
            y2={y(goal)}
            stroke="#ffd60a"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text x={W - padR} y={y(goal) - 4} textAnchor="end" fontSize="9" fill="#ffd60a">
            goal {fmt(goal)}
          </text>
        </g>
      )}

      {/* line + area */}
      <path d={path} fill="none" stroke="#a6ff00" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#a6ff00" />
      ))}

      {/* x-axis end labels */}
      <text x={padL} y={H - 6} textAnchor="start" fontSize="9" fill="#8e8e93">
        {dateLabel(series[0].date)}
      </text>
      {series.length > 1 && (
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize="9" fill="#8e8e93">
          {dateLabel(series.at(-1)!.date)}
        </text>
      )}

      {/* latest value callout */}
      <text
        x={pts.at(-1)!.x}
        y={Math.max(pts.at(-1)!.y - 8, padT + 8)}
        textAnchor="end"
        fontSize="11"
        fontWeight="700"
        fill="#f5f5f7"
      >
        {fmt(series.at(-1)!.value)}
        {suffix}
      </text>
    </svg>
  );
}
