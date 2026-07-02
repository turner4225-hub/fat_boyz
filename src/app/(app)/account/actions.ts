"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { feetInchesToCm } from "@/lib/health";

export type ProfileState = { error?: string; ok?: boolean } | undefined;

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();

  const displayName = String(formData.get("display_name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "lb");
  if (!displayName) return { error: "Enter a display name." };
  if (unit !== "lb" && unit !== "kg") return { error: "Pick a unit." };

  // Height: cm for metric, feet+inches for imperial. Blank = clear it.
  let heightCm: number | null = null;
  if (unit === "kg") {
    const cm = formData.get("height_cm");
    if (cm !== null && String(cm).trim() !== "") {
      const n = Number(cm);
      if (Number.isNaN(n) || n <= 0 || n > 300) {
        return { error: "Enter a valid height in cm." };
      }
      heightCm = n;
    }
  } else {
    const ft = String(formData.get("height_ft") ?? "").trim();
    const inch = String(formData.get("height_in") ?? "").trim();
    if (ft !== "" || inch !== "") {
      const f = Number(ft || 0);
      const i = Number(inch || 0);
      if (Number.isNaN(f) || Number.isNaN(i) || f < 0 || i < 0 || f > 9) {
        return { error: "Enter a valid height." };
      }
      heightCm = feetInchesToCm(f, i);
    }
  }

  let goalWeight: number | null = null;
  const goal = formData.get("goal_weight");
  if (goal !== null && String(goal).trim() !== "") {
    const g = Number(goal);
    if (Number.isNaN(g) || g <= 0) {
      return { error: "Enter a valid goal weight." };
    }
    goalWeight = g;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      unit,
      height_cm: heightCm,
      goal_weight: goalWeight,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/account");
  revalidatePath("/goals");
  return { ok: true };
}
