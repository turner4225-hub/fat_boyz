import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogForm } from "./log-form";

export default async function LogPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA");

  const { data: memberRows } = await supabase
    .from("challenge_members")
    .select("challenge:challenges(name, end_date)")
    .eq("user_id", user.id);

  const active = (memberRows ?? [])
    .map((m) => m.challenge as unknown as { name: string; end_date: string })
    .filter((c) => c && c.end_date >= today);

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-2xl font-bold">Log a weigh-in</h1>
      <p className="text-sm text-muted">
        {active.length > 0
          ? "One weigh-in counts toward every challenge you're in right now."
          : "Track your weight here even when no challenge is running."}
      </p>
      <LogForm
        userId={user.id}
        unit={profile?.unit ?? "lb"}
        challengeNames={active.map((c) => c.name)}
      />
    </div>
  );
}
