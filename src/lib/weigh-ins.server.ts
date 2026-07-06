import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  eligibleChallenges,
  planWeighIns,
  type ActiveChallenge,
  type WeighInInput,
} from "@/lib/weigh-ins";

export type SaveResult = { error?: string; count?: number };

/**
 * Save a member's OWN weigh-in. Because a person's weight on a day is one real
 * number, it's written to every active challenge they're in (converted per
 * challenge's unit), plus the challenge they logged from if given. Re-logging
 * the same day replaces that day's entry instead of stacking duplicates.
 *
 * `currentChallengeId` (the challenge page they logged from) is always
 * included even if it isn't otherwise "active", so logging there always counts.
 */
export async function saveOwnWeighIn(
  input: WeighInInput & { currentChallengeId?: string },
): Promise<SaveResult> {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA");

  const { data: memberRows } = await supabase
    .from("challenge_members")
    .select("challenge:challenges(id, unit, start_date, end_date)")
    .eq("user_id", input.userId);

  const all = (memberRows ?? [])
    .map((m) => m.challenge as unknown as ActiveChallenge)
    .filter(Boolean);

  let targets = eligibleChallenges(all, input.weighedOn, today);
  if (input.currentChallengeId) {
    const current = all.find((c) => c.id === input.currentChallengeId);
    if (current && !targets.some((t) => t.id === current.id)) {
      targets = [current, ...targets];
    }
  }

  const inserts = planWeighIns(targets, input);

  // Replace this member's existing entry for the same day so re-logging
  // updates rather than duplicates (no unique index needed).
  const ids = targets.map((t) => t.id);
  if (ids.length > 0) {
    await supabase
      .from("weigh_ins")
      .delete()
      .eq("user_id", input.userId)
      .eq("weighed_on", input.weighedOn)
      .in("challenge_id", ids);
  } else {
    await supabase
      .from("weigh_ins")
      .delete()
      .eq("user_id", input.userId)
      .is("challenge_id", null)
      .eq("weighed_on", input.weighedOn);
  }

  const { error } = await supabase.from("weigh_ins").insert(inserts);
  if (error) return { error: error.message };

  revalidatePath("/goals");
  revalidatePath("/account");
  revalidatePath("/dashboard");
  for (const t of targets) revalidatePath(`/challenges/${t.id}`);

  return { count: targets.length };
}
