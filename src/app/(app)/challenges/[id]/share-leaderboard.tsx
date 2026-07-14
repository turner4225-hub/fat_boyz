"use client";

import { useState } from "react";
import { formatLeaderboardText } from "@/lib/share";
import { drawLeaderboardCard, type CardRow } from "@/lib/leaderboard-image";

/**
 * Shares the standings as an image card via the native share sheet (Messages,
 * WhatsApp, …). Falls back to sharing/copying plain text where a browser can't
 * share files.
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
  rows: CardRow[];
  pot: number;
  currency: string;
}) {
  const [status, setStatus] = useState<"idle" | "working" | "copied">("idle");

  function textVersion() {
    return formatLeaderboardText({
      challengeName,
      ruleLabel,
      rows,
      pot,
      currency,
      url: window.location.origin,
    });
  }

  async function share() {
    setStatus("working");
    try {
      const blob = await drawLeaderboardCard({
        challengeName,
        ruleLabel,
        rows,
        pot,
        currency,
        siteLabel: window.location.host,
      });

      if (blob) {
        const file = new File([blob], "leaderboard.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
            return;
          } catch (err) {
            // Closing the share sheet isn't a failure worth reacting to.
            if ((err as Error)?.name === "AbortError") return;
          }
        }
      }

      // No file sharing (desktop browsers, older iOS) — fall back to text.
      const text = textVersion();
      if (navigator.share) {
        try {
          await navigator.share({ text });
          return;
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    } catch {
      /* nothing more we can do */
    } finally {
      setStatus((s) => (s === "working" ? "idle" : s));
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={status === "working"}
      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition hover:border-brand hover:text-foreground disabled:opacity-60"
    >
      {status === "copied" ? "Copied ✓" : status === "working" ? "…" : "Share"}
    </button>
  );
}
