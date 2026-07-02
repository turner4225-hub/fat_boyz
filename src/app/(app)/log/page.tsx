import Link from "next/link";
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

      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold">No active challenges</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            Weigh-ins are logged through your challenges. Join one with a code or
            start your own to begin tracking.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/challenges/new"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-black"
            >
              New challenge
            </Link>
            <Link
              href="/join"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
            >
              Join with code
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            One weigh-in counts toward every challenge you&apos;re in right now.
          </p>
          <LogForm
            unit={profile?.unit ?? "lb"}
            challengeNames={active.map((c) => c.name)}
          />
        </>
      )}
    </div>
  );
}
