"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // The browser client picks up the recovery session from the link's URL
    // fragment automatically. Wait briefly for that session to appear.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setPhase("ready");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPhase("ready");
      else setTimeout(() => setPhase((p) => (p === "checking" ? "invalid" : p)), 2500);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPhase("done");
    setTimeout(() => router.replace("/dashboard"), 1200);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7">
        <div className="mb-6 text-center">
          <span className="text-2xl font-black">
            Fat <span className="text-brand">Boyz</span>
          </span>
          <p className="mt-1 text-sm text-muted">Set a new password</p>
        </div>

        {phase === "checking" && (
          <p className="text-center text-sm text-muted">Checking your link…</p>
        )}

        {phase === "invalid" && (
          <div className="space-y-4 text-center">
            <p className="rounded-lg bg-red-500/10 px-3 py-3 text-sm text-red-400">
              This reset link is invalid or has expired. Request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block font-semibold text-brand hover:underline"
            >
              Send a new reset link
            </Link>
          </div>
        )}

        {phase === "done" && (
          <div className="rounded-lg bg-brand/10 px-3 py-4 text-center text-sm text-brand">
            Password updated. Taking you to your dashboard…
          </div>
        )}

        {phase === "ready" && (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">New password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted/60 focus:border-brand"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-black transition hover:bg-brand-strong disabled:opacity-60"
            >
              {pending ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
