"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { WinnerRule } from "@/lib/types";

export type FormState = { error?: string } | undefined;

const WINNER_RULES: WinnerRule[] = [
  "percent_lost",
  "total_lost",
  "first_to_target",
  "most_consistent",
  "last_standing",
];

type ChallengeValues = {
  name: string;
  buy_in_amount: number;
  currency: string;
  unit: string;
  start_date: string;
  end_date: string;
  weigh_in_day: number;
  winner_rule: string;
  target_type: string | null;
  target_amount: number | null;
  photo_proof: string;
  tie_breaker: string;
};

/** Parse + validate the shared challenge form fields. */
function parseChallengeForm(
  formData: FormData,
): { values: ChallengeValues } | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const buyIn = Number(formData.get("buy_in_amount") ?? 0);
  const currency = String(formData.get("currency") ?? "USD").trim() || "USD";
  const unit = String(formData.get("unit") ?? "lb");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const weighInDay = Number(formData.get("weigh_in_day") ?? 0);
  const winnerRule = String(formData.get("winner_rule") ?? "percent_lost");
  const photoProof = String(formData.get("photo_proof") ?? "optional");
  const tieBreaker = String(formData.get("tie_breaker") ?? "split");

  if (!name) return { error: "Give your challenge a name." };
  if (!startDate || !endDate) return { error: "Pick a start and end date." };
  if (endDate <= startDate) {
    return { error: "The end date has to be after the start date." };
  }
  if (Number.isNaN(buyIn) || buyIn < 0) {
    return { error: "Buy-in must be a number (0 or more)." };
  }
  if (!WINNER_RULES.includes(winnerRule as WinnerRule)) {
    return { error: "Pick how the winner is decided." };
  }

  let targetType: string | null = null;
  let targetAmount: number | null = null;
  if (winnerRule === "first_to_target") {
    targetType = String(formData.get("target_type") ?? "amount_lost");
    targetAmount = Number(formData.get("target_amount") ?? 0);
    if (Number.isNaN(targetAmount) || targetAmount <= 0) {
      return { error: "Enter the target number for this challenge." };
    }
  }

  return {
    values: {
      name,
      buy_in_amount: buyIn,
      currency,
      unit,
      start_date: startDate,
      end_date: endDate,
      weigh_in_day: weighInDay,
      winner_rule: winnerRule,
      target_type: targetType,
      target_amount: targetAmount,
      photo_proof: photoProof,
      tie_breaker: tieBreaker,
    },
  };
}

export async function createChallenge(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = parseChallengeForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({ ...parsed.values, created_by: user.id })
    .select("id")
    .single();

  if (error || !challenge) {
    return { error: error?.message ?? "Could not create the challenge." };
  }

  // Add the creator as an admin member.
  const { error: memberError } = await supabase
    .from("challenge_members")
    .insert({
      challenge_id: challenge.id,
      user_id: user.id,
      role: "admin",
    });

  if (memberError) return { error: memberError.message };

  revalidatePath("/dashboard");
  redirect(`/challenges/${challenge.id}`);
}

export async function updateChallenge(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const id = String(formData.get("challenge_id") ?? "");
  if (!id) return { error: "Missing challenge." };

  const parsed = parseChallengeForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  // RLS ensures only the creator can update.
  const { error } = await supabase
    .from("challenges")
    .update(parsed.values)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/challenges/${id}`);
  redirect(`/challenges/${id}`);
}

export async function joinByCode(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  if (!code) return { error: "Enter the join code." };

  const supabase = await createClient();
  const { data: challengeId, error } = await supabase.rpc(
    "join_challenge_by_code",
    { code },
  );

  if (error) return { error: error.message };
  if (!challengeId) return { error: "No challenge found for that code." };

  revalidatePath("/dashboard");
  redirect(`/challenges/${challengeId}`);
}
