import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

const rules = [
  {
    title: "% of body weight",
    body: "The classic. Whoever loses the biggest share of their starting weight wins. Fair across different sizes.",
  },
  {
    title: "Most weight lost",
    body: "Straight up pounds (or kg) off the scale. Simple and brutal.",
  },
  {
    title: "First to a target",
    body: "First person to hit a set goal — a number of pounds down, or a goal weight.",
  },
  {
    title: "Most consistent",
    body: "Best average weekly loss and fewest missed weigh-ins. Rewards showing up.",
  },
  {
    title: "Last one standing",
    body: "Everyone sets a goal. Miss it and you're out. Survivors split the pot.",
  },
];

const steps = [
  {
    n: "1",
    title: "Start a challenge",
    body: "Set the buy-in, the dates, the weigh-in day, and how the winner is decided.",
  },
  {
    n: "2",
    title: "Invite the crew",
    body: "Share a join link. Everyone logs their starting weight before the lock date.",
  },
  {
    n: "3",
    title: "Weigh in weekly",
    body: "Log your weight (with a scale photo if the challenge requires it). Watch the leaderboard move.",
  },
  {
    n: "4",
    title: "Winner takes the pot",
    body: "At the end, the app crowns the winner and shows the payout. You settle up over Venmo.",
  },
];

export default async function Home() {
  // Signed-in users (e.g. opening the installed shortcut) skip the marketing
  // page and land on their dashboard. Works for existing installs since they
  // all open "/".
  if (await getUser()) redirect("/dashboard");

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
        <p className="mb-4 inline-block rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold tracking-wide text-gold uppercase">
          Cash-pot weight loss challenges
        </p>
        <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
          Fat <span className="text-brand">Boyz</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Everyone throws in the buy-in. Whoever wins the challenge takes the
          pot. Track weigh-ins, trash-talk the leaderboard, and settle up at the
          end.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-brand px-6 py-3 font-semibold text-black transition hover:bg-brand-strong"
          >
            Get started
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-lg border border-border px-6 py-3 font-semibold text-foreground transition hover:bg-card"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-4xl scroll-mt-8 px-6 py-12"
      >
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-bold text-black">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rules */}
      <section id="rules" className="mx-auto max-w-4xl scroll-mt-8 px-6 py-12">
        <h2 className="text-center text-3xl font-bold">
          Pick how the winner wins
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted">
          Every challenge sets its own rule when it&apos;s created.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((r) => (
            <div
              key={r.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold text-brand">{r.title}</h3>
              <p className="mt-2 text-sm text-muted">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer note */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="text-2xl font-bold">Money stays between friends</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
            Fat Boyz tracks the pot and who&apos;s paid — it never holds or moves
            money. You collect the buy-ins and pay the winner however you already
            do (Venmo, Cash App, cash).
          </p>
        </div>
        <p className="mt-8 text-xs text-muted">Fat Boyz · built for the crew</p>
      </section>
    </main>
  );
}
