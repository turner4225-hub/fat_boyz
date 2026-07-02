"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V5m0 14h16M7 15l3.5-4 3 2.5L20 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const tabs = [
  {
    href: "/dashboard",
    label: "Home",
    icon: HomeIcon,
    match: (p: string) =>
      p.startsWith("/dashboard") ||
      p.startsWith("/join") ||
      p.startsWith("/challenges"),
  },
  {
    href: "/goals",
    label: "Goals",
    icon: ChartIcon,
    match: (p: string) => p.startsWith("/goals"),
  },
  {
    href: "/log",
    label: "Log",
    icon: PlusIcon,
    match: (p: string) => p.startsWith("/log"),
  },
  {
    href: "/account",
    label: "You",
    icon: UserIcon,
    match: (p: string) => p.startsWith("/account"),
  },
];

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div
        className="mx-auto flex max-w-4xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((t) => {
          const active = t.match(path);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                active ? "text-brand" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-6 w-6" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
