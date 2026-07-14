"use client";

import { useState } from "react";
import { formatLeaderboardText, type ShareRow } from "@/lib/share";

/**
 * Shares the standings as plain text. On a phone this opens the native share
 * sheet (Messages, WhatsApp, …); elsewhere it falls back to the clipboard.
 */
export function ShareLeaderboard({
  challengeName,
  ruleLabel,
  rows,
  pot,
  currency,
}: {
  challengeName: string;
  ruleLabel: string;
  rows: ShareRow[];
  pot: number;
  currency: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = formatLeaderboardText({
      challengeName,
      ruleLabel,
      rows,
      pot,
      currency,
      url: window.location.origin,
    });

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        // The user closing the share sheet isn't an error worth reacting to.
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nothing more we can do */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition hover:border-brand hover:text-foreground"
    >
      {copied ? "Copied ✓" : "Share"}
    </button>
  );
}
