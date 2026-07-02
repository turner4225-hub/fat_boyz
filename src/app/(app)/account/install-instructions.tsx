"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "desktop" | "unknown";

export function InstallInstructions() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari exposes this non-standard flag when launched from home screen
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setInstalled(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");
  }, []);

  if (installed) {
    return (
      <div className="rounded-2xl border border-brand/40 bg-brand/5 p-5">
        <p className="font-bold text-brand">✓ You&apos;re all set</p>
        <p className="mt-1 text-sm text-muted">
          Fat Boyz is running as an installed app on this device. Nice.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-bold">📲 Add Fat Boyz to your phone</h2>
      <p className="mt-1 text-sm text-muted">
        Install it once and it opens full-screen with its own icon — just like an
        app from the store.
      </p>

      <div className="mt-4">
        {platform === "ios" && <Steps steps={IOS_STEPS} />}
        {platform === "android" && <Steps steps={ANDROID_STEPS} />}
        {(platform === "desktop" || platform === "unknown") && (
          <div className="text-sm text-muted">
            <p className="mb-2">
              Open this site on your phone to install it there:
            </p>
            <p className="rounded-lg bg-background px-3 py-2 font-mono text-xs break-all">
              fat-boyz-one.vercel.app
            </p>
            <p className="mt-3">
              On desktop Chrome, click the <b>install icon</b> in the address bar
              (a little screen with a down-arrow).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand text-xs font-bold text-black">
            {i + 1}
          </span>
          <span
            className="pt-0.5"
            // steps contain simple <b> emphasis only
            dangerouslySetInnerHTML={{ __html: s }}
          />
        </li>
      ))}
    </ol>
  );
}

const IOS_STEPS = [
  "Open this site in <b>Safari</b> (not Chrome).",
  "Tap the <b>Share</b> button — the square with an up-arrow at the bottom of the screen.",
  "Scroll down and tap <b>Add to Home Screen</b>.",
  "Tap <b>Add</b> in the top-right. The donut icon appears on your home screen.",
];

const ANDROID_STEPS = [
  "Open this site in <b>Chrome</b>.",
  "Tap the <b>⋮ menu</b> in the top-right.",
  "Tap <b>Add to Home screen</b> (or <b>Install app</b>).",
  "Tap <b>Add</b> / <b>Install</b>. The donut icon appears on your home screen.",
];
