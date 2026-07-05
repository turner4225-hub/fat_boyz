"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7">
      <div className="mb-6 text-center">
        <Link href="/" className="text-2xl font-black">
          Fat <span className="text-brand">Boyz</span>
        </Link>
        <p className="mt-1 text-sm text-muted">
          {mode === "signin"
            ? "Welcome back. Sign in to weigh in."
            : "Create your account to join the crew."}
        </p>
      </div>

      {/* key forces the form (and its action state) to reset when switching modes */}
      <form key={mode} action={formAction} className="space-y-4">
        {mode === "signup" && (
          <Field
            label="Name"
            name="display_name"
            type="text"
            placeholder="Big Mike"
            autoComplete="name"
          />
        )}
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="you@email.com"
          autoComplete="email"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />

        {mode === "signin" && (
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-muted hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
        )}

        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-black transition hover:bg-brand-strong disabled:opacity-60"
        >
          {pending
            ? "One sec…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {mode === "signin" ? "New here? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="font-semibold text-brand hover:underline"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </span>
      <input
        {...props}
        required
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted/60 focus:border-brand"
      />
    </label>
  );
}
