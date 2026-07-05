"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-black">
            Fat <span className="text-brand">Boyz</span>
          </Link>
          <p className="mt-1 text-sm text-muted">
            Forgot your password? We&apos;ll email you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-brand/10 px-3 py-4 text-center text-sm text-brand">
            Check your email for a link to reset your password. It can take a
            couple of minutes to arrive.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
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
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-muted">
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
