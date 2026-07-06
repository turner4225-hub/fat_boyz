"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveOwnWeighIn } from "@/lib/weigh-ins.server";
import type { WeightUnit } from "@/lib/types";

export type WeighInState = { error?: string; ok?: boolean } | undefined;

/**
 * Guard against gaming the leaderboard by dating a weigh-in outside the valid
 * window. No future dates; for a challenge weigh-in, nothing before it started
 * (the earliest weigh-in is a member's baseline, so a backdated heavy entry
 * would inflate their loss). Returns an error string, or null if the date is ok.
 */
function validateWeighInDate(
  weighedOn: string,
  startDate?: string | null,
): string | null {
  const today = new Date().toLocaleDateString("en-CA");
  if (weighedOn > today) return "You can't log a weigh-in in the future.";
  if (startDate && weighedOn < startDate) {
    return "That date is before the challenge started.";
  }
  return null;
}

/** Verify the caller is the challenge's host. Returns an error string or null. */
async function requireHost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  challengeId: string,
  userId: string,
): Promise<string | null> {
  const { data: challenge } = await supabase
    .from("challenges")
    .select("created_by")
    .eq("id", challengeId)
    .single();
  if (!challenge) return "Challenge not found.";
  if (challenge.created_by !== userId) return "Only the host can do that.";
  return null;
}

export async function logWeighIn(
  _prev: WeighInState,
  formData: FormData,
): Promise<WeighInState> {
  const user = await requireUser();

  const challengeId = String(formData.get("challenge_id") ?? "");
  const weight = Number(formData.get("weight"));
  const weighedOn =
    String(formData.get("weighed_on") ?? "") ||
    new Date().toLocaleDateString("en-CA");
  const note = String(formData.get("note") ?? "").trim() || null;
  const photoUrl = String(formData.get("photo_url") ?? "").trim() || null;

  if (!challengeId) return { error: "Missing challenge." };
  if (Number.isNaN(weight) || weight <= 0) {
    return { error: "Enter a valid weight." };
  }
  if (weight > 2000) return { error: "That weight looks off — double-check it." };

  const supabase = await createClient();

  // Enforce the challenge's photo-proof setting + date window server-side.
  const { data: challenge } = await supabase
    .from("challenges")
    .select("photo_proof, unit, start_date, end_date")
    .eq("id", challengeId)
    .single();
  if (challenge?.photo_proof === "required" && !photoUrl) {
    return { error: "This challenge requires a scale photo." };
  }
  const dateError = validateWeighInDate(weighedOn, challenge?.start_date);
  if (dateError) return { error: dateError };

  // A member's weight is one real number — log it across every active
  // challenge they're in, not just this one.
  const result = await saveOwnWeighIn({
    userId: user.id,
    weight,
    sourceUnit: (challenge?.unit as WeightUnit) ?? "lb",
    weighedOn,
    photoUrl,
    note,
    currentChallengeId: challengeId,
  });
  if (result.error) return { error: result.error };

  return { ok: true };
}

/** Challenge host logs a weigh-in on behalf of a member. */
export async function adminLogWeighIn(
  _prev: WeighInState,
  formData: FormData,
): Promise<WeighInState> {
  const admin = await requireUser();
  const challengeId = String(formData.get("challenge_id") ?? "");
  const targetUserId = String(formData.get("target_user_id") ?? "");
  const weight = Number(formData.get("weight"));
  const weighedOn =
    String(formData.get("weighed_on") ?? "") ||
    new Date().toLocaleDateString("en-CA");
  const photoUrl = String(formData.get("photo_url") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!challengeId || !targetUserId) return { error: "Missing details." };
  if (Number.isNaN(weight) || weight <= 0) return { error: "Enter a valid weight." };
  if (weight > 2000) return { error: "That weight looks off." };

  const supabase = await createClient();

  // Only the host may log for others (RLS enforces this too).
  const { data: challenge } = await supabase
    .from("challenges")
    .select("created_by, start_date, end_date")
    .eq("id", challengeId)
    .single();
  if (!challenge || challenge.created_by !== admin.id) {
    return { error: "Only the host can log for other members." };
  }
  const dateError = validateWeighInDate(weighedOn, challenge.start_date);
  if (dateError) return { error: dateError };

  // Host logging for a member stays scoped to THIS challenge only. Replace any
  // existing same-day entry for that member here so it corrects, not stacks.
  await supabase
    .from("weigh_ins")
    .delete()
    .eq("user_id", targetUserId)
    .eq("challenge_id", challengeId)
    .eq("weighed_on", weighedOn);

  const { error } = await supabase.from("weigh_ins").insert({
    challenge_id: challengeId,
    user_id: targetUserId,
    weight,
    weighed_on: weighedOn,
    note: note ?? "Logged by host",
    photo_url: photoUrl,
  });

  if (error) return { error: error.message };

  revalidatePath(`/challenges/${challengeId}`);
  return { ok: true };
}

export async function deleteWeighIn(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("weigh_in_id") ?? "");
  const challengeId = String(formData.get("challenge_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // RLS also enforces this, but scope the delete to the owner explicitly.
  await supabase.from("weigh_ins").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath(`/challenges/${challengeId}`);
}

// --- Admin actions (creator only; RLS is the real gate) ---

/** Toggle whether a member has paid their buy-in. Host only. */
export async function togglePaid(formData: FormData) {
  const user = await requireUser();
  const memberId = String(formData.get("member_id") ?? "");
  const challengeId = String(formData.get("challenge_id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!memberId || !challengeId) return;

  const supabase = await createClient();
  if (await requireHost(supabase, challengeId, user.id)) return;

  await supabase
    .from("challenge_members")
    .update({ has_paid: next })
    .eq("id", memberId)
    .eq("challenge_id", challengeId);

  revalidatePath(`/challenges/${challengeId}`);
}

/** Remove a member from the challenge (host only; can't remove the creator). */
export async function removeMember(formData: FormData) {
  const user = await requireUser();
  const memberId = String(formData.get("member_id") ?? "");
  const challengeId = String(formData.get("challenge_id") ?? "");
  const createdBy = String(formData.get("created_by") ?? "");
  if (!memberId || !challengeId) return;

  const supabase = await createClient();
  if (await requireHost(supabase, challengeId, user.id)) return;

  await supabase
    .from("challenge_members")
    .delete()
    .eq("id", memberId)
    .eq("challenge_id", challengeId)
    .neq("user_id", createdBy); // never remove the challenge creator

  revalidatePath(`/challenges/${challengeId}`);
}

/** Host removes a member's weigh-in (fix a mistaken/bogus entry). */
export async function hostDeleteWeighIn(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("weigh_in_id") ?? "");
  const challengeId = String(formData.get("challenge_id") ?? "");
  if (!id || !challengeId) return;

  const supabase = await createClient();
  if (await requireHost(supabase, challengeId, user.id)) return;

  // RLS weighins_delete_by_host also enforces this.
  await supabase
    .from("weigh_ins")
    .delete()
    .eq("id", id)
    .eq("challenge_id", challengeId);

  revalidatePath(`/challenges/${challengeId}`);
}

/** A member leaves a challenge. The host can't leave — they delete it instead. */
export async function leaveChallenge(formData: FormData) {
  const user = await requireUser();
  const challengeId = String(formData.get("challenge_id") ?? "");
  if (!challengeId) return;

  const supabase = await createClient();
  const { data: challenge } = await supabase
    .from("challenges")
    .select("created_by")
    .eq("id", challengeId)
    .single();
  if (!challenge || challenge.created_by === user.id) return;

  await supabase
    .from("challenge_members")
    .delete()
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/** Delete the whole challenge (cascades to members + weigh-ins). */
export async function deleteChallenge(formData: FormData) {
  await requireUser();
  const challengeId = String(formData.get("challenge_id") ?? "");
  if (!challengeId) return;

  const supabase = await createClient();
  // RLS ensures only the creator can delete.
  await supabase.from("challenges").delete().eq("id", challengeId);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
