import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Challenge, ChallengeMember, Profile, WeighIn } from "@/lib/types";
import { formatDate, fmtWeight } from "@/lib/format";
import { statsByUser } from "@/lib/stats";
import { pctLabel } from "@/lib/leaderboard";
import { WEIGH_IN_BUCKET } from "@/lib/photos";

/**
 * Sign the given storage paths so an authorized viewer can see another member's
 * scale photos. Storage reads are owner-only (RLS), so we use the service-role
 * client to sign — safe here because the caller has already passed the
 * membership gate (the weigh-in rows were read under RLS, which requires
 * is_member), and we only ever sign paths that came from that authorized query.
 */
async function signPhotos(paths: string[]): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  if (paths.length === 0) return urls;
  try {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from(WEIGH_IN_BUCKET)
      .createSignedUrls(paths, 60 * 60);
    for (const s of data ?? []) {
      if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
    }
  } catch {
    // Service role not configured (e.g. local without the key) — show the
    // weigh-ins without photos rather than failing the page.
  }
  return urls;
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string; uid: string }>;
}) {
  const { id, uid } = await params;
  await requireUser();
  const supabase = await createClient();

  // Reading the challenge requires membership (RLS) — non-members 404 here.
  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", id)
    .single<Challenge>();
  if (!challenge) notFound();

  // The target must actually be a member of this challenge.
  const { data: memberRow } = await supabase
    .from("challenge_members")
    .select("*, profile:profiles(*)")
    .eq("challenge_id", id)
    .eq("user_id", uid)
    .single<ChallengeMember & { profile: Profile | null }>();
  if (!memberRow) notFound();

  const { data: weighInRows } = await supabase
    .from("weigh_ins")
    .select("*")
    .eq("challenge_id", id)
    .eq("user_id", uid);

  const weighIns = (weighInRows ?? []) as WeighIn[];
  const history = [...weighIns].sort(
    (a, b) =>
      b.weighed_on.localeCompare(a.weighed_on) ||
      b.created_at.localeCompare(a.created_at),
  );
  const stats = statsByUser(weighIns).get(uid);
  const unit = challenge.unit;
  const name = memberRow.profile?.display_name ?? "Member";

  const photoUrls = await signPhotos(
    history.map((w) => w.photo_url).filter((p): p is string => !!p),
  );

  return (
    <div>
      <Link
        href={`/challenges/${id}`}
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to {challenge.name}
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-card-2 text-lg font-black">
          {name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          {memberRow.user_id === challenge.created_by && (
            <p className="text-xs text-muted">Host</p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted">Progress in {challenge.name}</p>
        {stats ? (
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-black tracking-tight">
                {fmtWeight(stats.current)}{" "}
                <span className="text-base font-semibold text-muted">
                  {unit}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted">
                Started at {fmtWeight(stats.start)} {unit} · {stats.count}{" "}
                {stats.count === 1 ? "weigh-in" : "weigh-ins"}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-2xl font-black ${
                  stats.lostAbs >= 0 ? "text-brand" : "text-ring1"
                }`}
              >
                {pctLabel(stats)}
              </p>
              <p className="text-sm text-muted">
                {stats.lostAbs >= 0 ? "lost" : "gained"}{" "}
                {fmtWeight(Math.abs(stats.lostAbs))} {unit}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No weigh-ins yet.</p>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Weigh-ins</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {history.map((w) => (
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
