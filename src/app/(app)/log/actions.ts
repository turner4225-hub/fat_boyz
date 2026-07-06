"use server";

import { requireUser, getProfile } from "@/lib/auth";
import { saveOwnWeighIn } from "@/lib/weigh-ins.server";

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
  const note = String(formData.get("note") ?? "").trim() || null;

  if (Number.isNaN(weight) || weight <= 0) {
    return { error: "Enter a valid weight." };
  }
  if (weight > 2000) return { error: "That weight looks off." };

  const today = new Date().toLocaleDateString("en-CA");
  if (weighedOn > today) {
    return { error: "You can't log a weigh-in in the future." };
  }

  const result = await saveOwnWeighIn({
    userId: user.id,
    weight,
    sourceUnit: unit,
    weighedOn,
    photoUrl,
    note,
  });
  if (result.error) return { error: result.error };

  return { ok: true, count: result.count };
}
