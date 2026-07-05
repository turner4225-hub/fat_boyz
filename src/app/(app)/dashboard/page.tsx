import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Challenge } from "@/lib/types";
import { formatDate } from "@/lib/format";

type Status = "Upcoming" | "Active" | "Finished";

function statusOf(c: Challenge, today: string): Status {
  if (today < c.start_date) return "Upcoming";
  if (today > c.end_date) return "Finished";
  return "Active";
}

/** Days between two YYYY-MM-DD dates (b - a), floored. */
function daysBetween(a: string, b: string): number {
  const ms =
    new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

function timeLeftLabel(c: Challenge, today: string, status: Status): string {
  if (status === "Finished") return "Ended " + formatDate(c.end_date);
  if (status === "Upcoming") {
    const d = daysBetween(today, c.start_date);
    return d <= 1 ? "Starts tomorrow" : `Starts in ${d} days`;
  }
  const d = daysBetween(today, c.end_date);
  if (d <= 0) return "Ends today";
  if (d === 1) return "1 day left";
  if (d < 14) return `${d} days left`;
  return `${Math.round(d / 7)} weeks left`;
}

const STATUS_STYLE: Record<Status, string> = {
  Active: "bg-brand/15 text-brand",
  Upcoming: "bg-gold/15 text-gold",
  Finished: "bg-card-2 text-muted",
};

// Sort order: Active first, then Upcoming, then Finished.
const STATUS_ORDER: Record<Status, number> = {
  Active: 0,
  Upcoming: 1,
  Finished: 2,
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA");

  // Challenges the user belongs to (creator is added as a member on create).
  const { data: memberships } = await supabase
    .from("challenge_members")
    .select("challenge:challenges(*)")
    .eq("user_id", user.id);

  const challenges = (memberships ?? [])
    .map((m) => m.challenge as unknown as Challenge)
    .filter(Boolean);

  // Member counts per challenge → prize pot (buy-in × members).
  const ids = challenges.map((c) => c.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: memberRows } = await supabase
      .from("challenge_members")
      .select("challenge_id")
      .in("challenge_id", ids);
    for (const row of memberRows ?? []) {
      counts.set(row.challenge_id, (counts.get(row.challenge_id) ?? 0) + 1);
    }
  }

  const cards = challenges
    .map((c) => {
      const status = statusOf(c, today);
      const memberCount = counts.get(c.id) ?? 1;
      return {
        c,
        status,
        memberCount,
        pot: c.buy_in_amount * memberCount,
        timeLeft: timeLeftLabel(c, today, status),
      };
    })
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        b.c.created_at.localeCompare(a.c.created_at),
    );

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

      {cards.length === 0 ? (
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
          {cards.map(({ c, status, memberCount, pot, timeLeft }) => (
            <li key={c.id}>
              <Link
                href={`/challenges/${c.id}`}
                className="block rounded-xl border border-border bg-card p-5 transition hover:border-brand"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{c.name}</h2>
                  <span
                    className={`flex-none rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[status]}`}
                  >
                    {status}
                  </span>
                </div>
                <p className="mt-2 text-lg font-black tracking-tight">
                  {c.currency} {pot.toLocaleString()}
                  <span className="ml-1 text-xs font-medium text-muted">
                    pot · {memberCount}{" "}
                    {memberCount === 1 ? "member" : "members"}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted">{timeLeft}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
