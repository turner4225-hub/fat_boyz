import Link from "next/link";
import { JoinForm } from "./join-form";

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-sm">
      <Link
        href="/dashboard"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 mb-2 text-2xl font-bold">Join a challenge</h1>
      <p className="mb-6 text-sm text-muted">
        Enter the code a friend shared with you.
      </p>
      <JoinForm />
    </div>
  );
}
