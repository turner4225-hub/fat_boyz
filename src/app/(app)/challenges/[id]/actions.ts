"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type WeighInState = { error?: string; ok?: boolean } | undefined;

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

  // Enforce the challenge's photo-proof setting server-side.
  const { data: challenge } = await supabase
    .from("challenges")
    .select("photo_proof")
    .eq("id", challengeId)
    .single();
  if (challenge?.photo_proof === "required" && !photoUrl) {
    return { error: "This challenge requires a scale photo." };
  }

  const { error } = await supabase.from("weigh_ins").insert({
    challenge_id: challengeId,
    user_id: user.id,
    weight,
    weighed_on: weighedOn,
    note,
    photo_url: photoUrl,
  });

  if (error) return { error: error.message };

  revalidatePath(`/challenges/${challengeId}`);
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
    .select("created_by")
    .eq("id", challengeId)
    .single();
  if (!challenge || challenge.created_by !== admin.id) {
    return { error: "Only the host can log for other members." };
  }

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

/** Toggle whether a member has paid their buy-in. */
export async function togglePaid(formData: FormData) {
  await requireUser();
  const memberId = String(formData.get("member_id") ?? "");
  const challengeId = String(formData.get("challenge_id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!memberId) return;

  const supabase = await createClient();
  await supabase
    .from("challenge_members")
    .update({ has_paid: next })
    .eq("id", memberId);

  revalidatePath(`/challenges/${challengeId}`);
}

/** Remove a member from the challenge (can't remove the creator). */
export async function removeMember(formData: FormData) {
  await requireUser();
  const memberId = String(formData.get("member_id") ?? "");
  const challengeId = String(formData.get("challenge_id") ?? "");
  const createdBy = String(formData.get("created_by") ?? "");
  if (!memberId) return;

  const supabase = await createClient();
  await supabase
    .from("challenge_members")
    .delete()
    .eq("id", memberId)
    .neq("user_id", createdBy); // never remove the challenge creator

  revalidatePath(`/challenges/${challengeId}`);
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
