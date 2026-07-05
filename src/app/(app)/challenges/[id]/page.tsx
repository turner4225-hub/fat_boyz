import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Challenge, WeighIn } from "@/lib/types";
import { formatDate, fmtWeight } from "@/lib/format";
import { statsByUser } from "@/lib/stats";
import {
  buildLeaderboard,
  formatGap,
  pctLabel,
  WINNER_RULE_LABELS,
  type MemberWithProfile,
} from "@/lib/leaderboard";
import { WEIGH_IN_BUCKET } from "@/lib/photos";
import { Ring, RING_COLORS } from "./ring";
import { CopyCode } from "./copy-code";
import { WeighInForm } from "./weigh-in-form";
import { AdminWeighInForm } from "./admin-weigh-in-form";
import { ConfirmButton } from "./confirm-button";
import {
  deleteWeighIn,
  togglePaid,
  removeMember,
  deleteChallenge,
  hostDeleteWeighIn,
  leaveChallenge,
} from "./actions";
import { BroadcastForm } from "./broadcast-form";

function statusOf(c: Challenge): "Upcoming" | "Active" | "Finished" {
  const today = new Date().toLocaleDateString("en-CA");
  if (today < c.start_date) return "Upcoming";
  if (today > c.end_date) return "Finished";
  return "Active";
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", id)
    .single<Challenge>();

  if (!challenge) notFound();

  const [{ data: memberRows }, { data: weighInRows }] = await Promise.all([
    supabase
      .from("challenge_members")
      .select("*, profile:profiles(*)")
      .eq("challenge_id", id),
    supabase.from("weigh_ins").select("*").eq("challenge_id", id),
  ]);

  const members = (memberRows ?? []) as unknown as MemberWithProfile[];
  const weighIns = (weighInRows ?? []) as WeighIn[];
  const stats = statsByUser(weighIns);
  const rows = buildLeaderboard(members, stats, challenge, weighIns);

  const pot = challenge.buy_in_amount * members.length;
  const unit = challenge.unit;
  const isAdmin = challenge.created_by === user.id;
  const status = statusOf(challenge);
  const paidCount = members.filter((m) => m.has_paid).length;
  const myStats = stats.get(user.id);
  const myRow = rows.find((r) => r.member.user_id === user.id);
  const leader = rows[0];

  // Winner(s) once the challenge is over: everyone sharing rank 1 (a tie under
  // the "split" rule can crown several, who split the pot).
  const winners = status === "Finished" ? rows.filter((r) => r.isLeader) : [];
  const winnerShare =
    winners.length > 0 ? Math.round(pot / winners.length) : 0;

  // Most recent weigh-in per member — powers the host's "remove entry" control.
  const latestWeighInByUser = new Map<string, WeighIn>();
  for (const wi of weighIns) {
    const cur = latestWeighInByUser.get(wi.user_id);
    if (
      !cur ||
      wi.weighed_on > cur.weighed_on ||
      (wi.weighed_on === cur.weighed_on && wi.created_at > cur.created_at)
    ) {
      latestWeighInByUser.set(wi.user_id, wi);
    }
  }
  const toFirst =
    myRow && leader && myRow.rank > 1 && myStats
      ? formatGap(challenge, leader.metric - myRow.metric)
      : null;

  const myWeighIns = weighIns
    .filter((w) => w.user_id === user.id)
    .sort((a, b) => b.weighed_on.localeCompare(a.weighed_on));

  // Signed URLs for your weigh-in photos (private bucket, 1-hour links).
  const myPhotoPaths = myWeighIns
    .map((w) => w.photo_url)
    .filter((p): p is string => !!p);
  const photoUrls: Record<string, string> = {};
  if (myPhotoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(WEIGH_IN_BUCKET)
      .createSignedUrls(myPhotoPaths, 60 * 60);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) photoUrls[s.path] = s.signedUrl;
    }
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to dashboard
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{challenge.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {formatDate(challenge.start_date)} – {formatDate(challenge.end_date)}{" "}
            · Winner: {WINNER_RULE_LABELS[challenge.winner_rule]}
          </p>
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-gold uppercase">
          {status}
        </span>
      </div>

      {isAdmin && (
        <div className="mt-4 flex gap-2">
          <Link
            href={`/challenges/${challenge.id}/edit`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-card"
          >
            Edit challenge
          </Link>
          <form action={deleteChallenge}>
            <input type="hidden" name="challenge_id" value={challenge.id} />
            <ConfirmButton
              message="Delete this challenge for everyone? This can't be undone."
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ring1 transition hover:bg-card"
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      )}

      {/* Winner banner (finished challenges) */}
      {status === "Finished" && (
        <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-6 text-center">
          {winners.length > 0 ? (
            <>
              <p className="text-xs font-bold tracking-wide text-gold uppercase">
                🏆 Winner{winners.length > 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-2xl font-black">
                {winners
                  .map((wRow) => wRow.member.profile?.display_name ?? "Member")
                  .join(" & ")}
              </p>
              <p className="mt-1 text-sm text-muted">
                {winners.length > 1
                  ? `Split the pot — ${challenge.currency} ${winnerShare.toLocaleString()} each`
                  : `Takes the ${challenge.currency} ${pot.toLocaleString()} pot`}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">
              This challenge ended with no weigh-ins on the board.
            </p>
          )}
        </div>
      )}

      {/* Stat pills */}
      <div className="mt-6 flex gap-3">
        <Pill k="Your rank" v={myRow ? `#${myRow.rank}` : "—"} />
        <Pill
          k="Prize pot"
          v={`${challenge.currency} ${pot.toLocaleString()}`}
        />
        <Pill
          k="To 1st"
          v={myRow?.rank === 1 ? "Leading 👑" : (toFirst ?? "—")}
          highlight={!!toFirst}
        />
      </div>

      {/* Your progress */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted">Your progress</p>
        {myStats ? (
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-black tracking-tight">
                {fmtWeight(myStats.current)}{" "}
                <span className="text-base font-semibold text-muted">
                  {unit}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted">
                Started at {fmtWeight(myStats.start)} {unit} · {myStats.count}{" "}
                {myStats.count === 1 ? "weigh-in" : "weigh-ins"}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-2xl font-black ${
                  myStats.lostAbs >= 0 ? "text-brand" : "text-ring1"
                }`}
              >
                {pctLabel(myStats)}
              </p>
              <p className="text-sm text-muted">
                {myStats.lostAbs >= 0 ? "lost" : "gained"}{" "}
                {fmtWeight(Math.abs(myStats.lostAbs))} {unit}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No weigh-ins yet. Log your starting weight to get on the board.
          </p>
        )}
      </div>

      {/* Log weigh-in */}
      <div className="mt-4">
        <WeighInForm
          challengeId={challenge.id}
          userId={user.id}
          unit={unit}
          photoProof={challenge.photo_proof}
        />
      </div>

      {/* Leaderboard */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Leaderboard</h2>
          <span className="rounded-full bg-card-2 px-3 py-1 text-xs font-semibold text-muted">
            {WINNER_RULE_LABELS[challenge.winner_rule]}
          </span>
        </div>
        <ul className="space-y-2">
          {rows.map((row) => {
            const color = RING_COLORS[(row.rank - 1) % RING_COLORS.length];
            const name = row.member.profile?.display_name ?? "Member";
            const isYou = row.member.user_id === user.id;
            const metricColor = !row.stats
              ? "text-muted"
              : row.stats.lostAbs >= 0
                ? "text-brand"
                : "text-ring1";
            return (
              <li
                key={row.member.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 pr-4 ${
                  isYou
                    ? "border-brand/40 bg-brand/5"
                    : "border-border bg-card"
                }`}
              >
                <span className="w-5 text-center text-sm font-extrabold text-muted">
                  {row.rank}
                </span>
                <Ring fill={row.ringFill} color={color} label={name.charAt(0).toUpperCase()} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="truncate">{name}</span>
                    {row.isLeader && <span>👑</span>}
                    {isYou && (
                      <span className="text-xs font-medium text-muted">
                        (you)
                      </span>
                    )}
                    {row.missed && (
                      <span className="rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-extrabold text-black uppercase">
                        missed
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted">
                    {row.stats
                      ? `${fmtWeight(row.stats.start)} → ${fmtWeight(
                          row.stats.current,
                        )} ${unit}`
                      : "No weigh-ins yet"}
                    {row.member.has_paid ? "" : " · not paid"}
                  </p>
                </div>
                <span className={`text-lg font-black ${metricColor}`}>
                  {row.displayMetric}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Admin: manage members & payments */}
      {isAdmin && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Manage members</h2>
            <span className="text-xs text-muted">
              {paidCount}/{members.length} paid
            </span>
          </div>
          <div className="mb-3">
            <AdminWeighInForm
              challengeId={challenge.id}
              adminUserId={user.id}
              unit={unit}
              photoProof={challenge.photo_proof}
              members={members.map((m) => ({
                user_id: m.user_id,
                name: m.profile?.display_name ?? "Member",
              }))}
            />
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <span className="truncate font-medium">
                    {m.profile?.display_name ?? "Member"}
                    {m.user_id === challenge.created_by && (
                      <span className="ml-2 text-xs text-muted">(host)</span>
                    )}
                  </span>
                  {latestWeighInByUser.get(m.user_id) && (
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      Last: {fmtWeight(latestWeighInByUser.get(m.user_id)!.weight)}{" "}
                      {unit} ·{" "}
                      {formatDate(latestWeighInByUser.get(m.user_id)!.weighed_on)}
                      <form action={hostDeleteWeighIn}>
                        <input
                          type="hidden"
                          name="weigh_in_id"
                          value={latestWeighInByUser.get(m.user_id)!.id}
                        />
                        <input
                          type="hidden"
                          name="challenge_id"
                          value={challenge.id}
                        />
                        <ConfirmButton
                          message={`Remove ${m.profile?.display_name ?? "this member"}'s last weigh-in?`}
                          className="text-ring1 transition hover:underline"
                        >
                          remove
                        </ConfirmButton>
                      </form>
                    </span>
                  )}
                </div>
                <div className="flex flex-none items-center gap-2">
                  <form action={togglePaid}>
                    <input type="hidden" name="member_id" value={m.id} />
                    <input
                      type="hidden"
                      name="challenge_id"
                      value={challenge.id}
                    />
                    <input
                      type="hidden"
                      name="next"
                      value={(!m.has_paid).toString()}
                    />
                    <button
                      type="submit"
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        m.has_paid
                          ? "bg-brand/15 text-brand hover:bg-brand/25"
                          : "border border-border text-muted hover:bg-background"
                      }`}
                    >
                      {m.has_paid ? "Paid ✓" : "Mark paid"}
                    </button>
                  </form>
                  {m.user_id !== challenge.created_by && (
                    <form action={removeMember}>
                      <input type="hidden" name="member_id" value={m.id} />
                      <input
                        type="hidden"
                        name="challenge_id"
                        value={challenge.id}
                      />
                      <input
                        type="hidden"
                        name="created_by"
                        value={challenge.created_by}
                      />
                      <ConfirmButton
                        message={`Remove ${m.profile?.display_name ?? "this member"} from the challenge?`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:text-ring1"
                      >
                        Remove
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && (
        <BroadcastForm challengeId={challenge.id} challengeName={challenge.name} />
      )}

      {/* Your weigh-in history */}
      {myWeighIns.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Your weigh-ins</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {myWeighIns.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {w.photo_url && photoUrls[w.photo_url] && (
                    <a
                      href={photoUrls[w.photo_url]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrls[w.photo_url]}
                        alt="scale proof"
                        className="h-10 w-10 rounded-lg border border-border object-cover"
                      />
                    </a>
                  )}
                  <div className="min-w-0">
                    <span className="font-semibold">
                      {fmtWeight(w.weight)} {unit}
                    </span>
                    <span className="ml-2 text-sm text-muted">
                      {formatDate(w.weighed_on)}
                    </span>
                    {w.note && (
                      <p className="truncate text-sm text-muted">{w.note}</p>
                    )}
                  </div>
                </div>
                <form action={deleteWeighIn}>
                  <input type="hidden" name="weigh_in_id" value={w.id} />
                  <input type="hidden" name="challenge_id" value={challenge.id} />
                  <button
                    type="submit"
                    className="text-xs text-muted transition hover:text-ring1"
                    aria-label="Delete weigh-in"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invite */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted">Invite the crew</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="rounded-lg bg-background px-3 py-1.5 font-mono text-lg tracking-widest">
            {challenge.join_code}
          </span>
          <CopyCode code={challenge.join_code} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Friends tap “Join with code” on their dashboard and enter this.
        </p>
      </div>

      {/* Leave (members only; the host deletes the challenge instead) */}
      {!isAdmin && (
        <form action={leaveChallenge} className="mt-6 text-center">
          <input type="hidden" name="challenge_id" value={challenge.id} />
          <ConfirmButton
            message="Leave this challenge? You'll drop off the leaderboard."
            className="text-sm text-muted transition hover:text-ring1"
          >
            Leave challenge
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}

function Pill({
  k,
  v,
  highlight,
}: {
  k: string;
  v: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-muted uppercase">{k}</p>
      <p
        className={`mt-1 text-xl font-black tracking-tight ${
          highlight ? "text-brand" : ""
        }`}
      >
        {v}
      </p>
    </div>
  );
}
