import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { buildTimeline, type RawWeighIn } from "@/lib/personal";
import { bmi, bmiCategory } from "@/lib/health";
import { fmtWeight } from "@/lib/format";
import { InstallInstructions } from "./install-instructions";
import { NotificationSettings } from "./notification-settings";
import { ProfileForm } from "./profile-form";

export default async function AccountPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("weigh_ins")
    .select("weight, weighed_on, created_at, challenge:challenges(unit)")
    .eq("user_id", user.id);

  const unit = profile?.unit ?? "lb";
  const timeline = buildTimeline(
    (rows ?? []).map((r) => ({
      weight: r.weight,
      weighed_on: r.weighed_on,
      created_at: r.created_at,
      unit: (r.challenge as unknown as { unit: "lb" | "kg" })?.unit ?? unit,
    })) as RawWeighIn[],
    unit,
  );
  const current = timeline.at(-1)?.weight ?? null;
  const bmiValue =
    current !== null ? bmi(current, unit, profile?.height_cm ?? null) : null;

  const { count: subCount } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">You</h1>
        <p className="mt-1 text-sm text-muted">
          {profile?.display_name ?? "Member"} · {user.email}
        </p>
      </div>

      {bmiValue !== null && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="text-sm text-muted">Current BMI</p>
            <p className="text-3xl font-black">{bmiValue.toFixed(1)}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-brand">{bmiCategory(bmiValue)}</p>
            <p className="text-sm text-muted">
              at {fmtWeight(current!)} {unit}
            </p>
          </div>
        </div>
      )}

      {profile && <ProfileForm profile={profile} />}

      <InstallInstructions />

      <NotificationSettings
        vapidPublicKey={vapidPublicKey}
        weighInReminders={profile?.weigh_in_reminders ?? true}
        hasSubscription={(subCount ?? 0) > 0}
      />

      <form action={signOut}>
        <button
          type="submit"
          className="w-full rounded-lg border border-border px-4 py-3 font-semibold transition hover:bg-card"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
