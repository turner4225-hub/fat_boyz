import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Challenge } from "@/lib/types";
import { ChallengeForm } from "../../challenge-form";
import { updateChallenge } from "../../actions";

export default async function EditChallengePage({
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
  // Only the creator can edit.
  if (challenge.created_by !== user.id) redirect(`/challenges/${id}`);

  return (
    <div>
      <Link
        href={`/challenges/${id}`}
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to challenge
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-bold">Edit challenge</h1>
      <ChallengeForm
        action={updateChallenge}
        defaults={challenge}
        challengeId={id}
        submitLabel="Save changes"
        pendingLabel="Saving…"
      />
    </div>
  );
}
