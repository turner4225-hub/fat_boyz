import Link from "next/link";
import { ChallengeForm } from "../challenge-form";
import { createChallenge } from "../actions";

export default function NewChallengePage() {
  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-bold">New challenge</h1>
      <ChallengeForm
        action={createChallenge}
        submitLabel="Create challenge"
        pendingLabel="Creating…"
      />
    </div>
  );
}
