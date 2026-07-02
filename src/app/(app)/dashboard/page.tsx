import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Challenge } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Challenges the user belongs to (creator is added as a member on create).
  const { data: memberships } = await supabase
    .from("challenge_members")
    .select("challenge:challenges(*)")
    .eq("user_id", user.id);

  const challenges = (memberships ?? [])
    .map((m) => m.challenge as unknown as Challenge)
    .filter(Boolean)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your challenges</h1>
        <div className="flex gap-2">
          <Link
            href="/join"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-card"
          >
            Join with code
          </Link>
          <Link
            href="/challenges/new"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-strong"
          >
            + New challenge
          </Link>
        </div>
      </div>

      {challenges.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-lg font-semibold">No challenges yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Start one and invite the crew, or join an existing challenge with a
            code someone shared.
          </p>
          <Link
            href="/challenges/new"
            className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 font-semibold text-black transition hover:bg-brand-strong"
          >
            Start your first challenge
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {challenges.map((c) => (
            <li key={c.id}>
              <Link
                href={`/challenges/${c.id}`}
                className="block rounded-xl border border-border bg-card p-5 transition hover:border-brand"
              >
                <h2 className="font-semibold">{c.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {c.currency} {c.buy_in_amount} buy-in ·{" "}
                  {formatDate(c.start_date)} – {formatDate(c.end_date)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
