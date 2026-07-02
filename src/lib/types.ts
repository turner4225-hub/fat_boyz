/**
 * Domain types for Fat Boyz. These mirror the database tables defined in
 * supabase/schema.sql. Keep the two in sync when you change the schema.
 */

export type WeightUnit = "lb" | "kg";

/** How a challenge decides its winner. */
export type WinnerRule =
  | "percent_lost" // biggest % of starting body weight lost (default)
  | "total_lost" // most absolute weight lost
  | "first_to_target" // first to reach target_amount (see target_type)
  | "most_consistent" // best avg weekly loss / fewest missed weigh-ins
  | "last_standing"; // everyone sets a goal; miss it and you're out

/** For first_to_target challenges: is the target an amount to lose or a goal weight? */
export type TargetType = "amount_lost" | "goal_weight";

/** Whether a scale photo is needed for a weigh-in to count. */
export type PhotoProof = "off" | "optional" | "required";

/** What happens on a tie. */
export type TieBreaker = "split" | "earliest_best";

export type ChallengeStatus = "upcoming" | "active" | "finished";

export type MemberRole = "admin" | "member";

export interface Profile {
  id: string; // = auth.users.id
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Challenge {
  id: string;
  name: string;
  created_by: string;
  buy_in_amount: number;
  currency: string; // e.g. "USD"
  unit: WeightUnit;
  start_date: string; // ISO date
  end_date: string; // ISO date
  weigh_in_day: number; // 0 = Sunday .. 6 = Saturday
  winner_rule: WinnerRule;
  target_type: TargetType | null;
  target_amount: number | null;
  photo_proof: PhotoProof;
  tie_breaker: TieBreaker;
  join_code: string;
  created_at: string;
}

export interface ChallengeMember {
  id: string;
  challenge_id: string;
  user_id: string;
  role: MemberRole;
  has_paid: boolean;
  starting_weight: number | null;
  joined_at: string;
}

export interface WeighIn {
  id: string;
  challenge_id: string;
  user_id: string;
  weight: number;
  photo_url: string | null;
  weighed_on: string; // ISO date of the weigh-in
  note: string | null;
  created_at: string;
}
