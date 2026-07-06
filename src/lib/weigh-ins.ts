import type { WeightUnit } from "./types";
import { convertWeight } from "./health";

/** A challenge a weigh-in could be written to, with the fields we need. */
export interface ActiveChallenge {
  id: string;
  unit: WeightUnit;
  start_date: string;
  end_date: string;
}

export interface WeighInInsert {
  challenge_id: string | null;
  user_id: string;
  weight: number;
  weighed_on: string;
  photo_url: string | null;
  note: string | null;
}

export interface WeighInInput {
  userId: string;
  weight: number; // in `sourceUnit`
  sourceUnit: WeightUnit;
  weighedOn: string;
  photoUrl: string | null;
  note: string | null;
}

/**
 * The challenges a self-logged weigh-in should count toward: ones the user is
 * in that are running (not ended) and had already started by the weigh-in date.
 * You can't backdate a weigh-in into a challenge that hadn't begun yet.
 */
export function eligibleChallenges(
  all: ActiveChallenge[],
  weighedOn: string,
  today: string,
): ActiveChallenge[] {
  return all.filter(
    (c) => c && c.end_date >= today && c.start_date <= weighedOn,
  );
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build the weigh-in rows to insert. A member's weight on a day is one real
 * number, so it's written to every target challenge (converted into each
 * challenge's unit). With no target challenges it becomes a single personal
 * row (challenge_id null), kept in the source unit.
 */
export function planWeighIns(
  targets: ActiveChallenge[],
  input: WeighInInput,
): WeighInInsert[] {
  if (targets.length === 0) {
    return [
      {
        challenge_id: null,
        user_id: input.userId,
        weight: input.weight,
        weighed_on: input.weighedOn,
        photo_url: input.photoUrl,
        note: input.note,
      },
    ];
  }
  return targets.map((c) => ({
    challenge_id: c.id,
    user_id: input.userId,
    weight: roundTo2(convertWeight(input.weight, input.sourceUnit, c.unit)),
    weighed_on: input.weighedOn,
    photo_url: input.photoUrl,
    note: input.note,
  }));
}
