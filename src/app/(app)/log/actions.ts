"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { convertWeight } from "@/lib/health";

export type LogState =
  | { error?: string; ok?: boolean; count?: number }
  | undefined;

export async function logWeighInEverywhere(
  _prev: LogState,
  formData: FormData,
): Promise<LogState> {
  const user = await requireUser();
  const profile = await getProfile();
  const unit = profile?.unit ?? "lb";

  const weight = Number(formData.get("weight"));
  const weighedOn =
    String(formData.get("weighed_on") ?? "") ||
    new Date().toLocaleDateString("en-CA");
  const photoUrl = String(formData.get("photo_url") ?? "").trim() || null;

  if (Number.isNaN(weight) || weight <= 0) {
    return { error: "Enter a valid weight." };
  }
  if (weight > 2000) return { error: "That weight looks off." };

  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA");
  if (weighedOn > today) {
    return { error: "You can't log a weigh-in in the future." };
  }

  // Challenges the user is in that are running and had already started by the
  // weigh-in date (can't backdate a weigh-in into a challenge before it began).
  const { data: memberRows } = await supabase
    .from("challenge_members")
    .select("challenge:challenges(id, unit, start_date, end_date)")
    .eq("user_id", user.id);

  const challenges = (memberRows ?? [])
    .map((m) => m.challenge as unknown as {
      id: string;
      unit: "lb" | "kg";
      start_date: string;
      end_date: string;
    })
    .filter((c) => c && c.end_date >= today && c.start_date <= weighedOn);

  // No active challenge → save one personal weigh-in (challenge_id null).
  type WeighInInsert = {
    challenge_id: string | null;
    user_id: string;
    weight: number;
    weighed_on: string;
    photo_url: string | null;
  };
  const inserts: WeighInInsert[] =
    challenges.length === 0
      ? [
          {
            challenge_id: null,
            user_id: user.id,
            weight,
            weighed_on: weighedOn,
            photo_url: photoUrl,
          },
        ]
      : challenges.map((c) => ({
          challenge_id: c.id,
          user_id: user.id,
          weight: Math.round(convertWeight(weight, unit, c.unit) * 100) / 100,
          weighed_on: weighedOn,
          photo_url: photoUrl,
        }));

  const { error } = await supabase.from("weigh_ins").insert(inserts);
  if (error) return { error: error.message };

  revalidatePath("/goals");
  revalidatePath("/account");
  revalidatePath("/dashboard");
  for (const c of challenges) revalidatePath(`/challenges/${c.id}`);

  return { ok: true, count: challenges.length };
}
