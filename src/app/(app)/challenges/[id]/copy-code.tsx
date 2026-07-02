"use client";

import { useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard blocked — no-op
        }
      }}
      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-background"
    >
      {copied ? "Copied!" : "Copy code"}
    </button>
  );
}
