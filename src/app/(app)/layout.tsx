import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth";
import { BottomNav } from "./bottom-nav";

/** Shared shell for every signed-in page: requires auth, header, and bottom nav. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const profile = await getProfile();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-black">
            Fat <span className="text-brand">Boyz</span>
          </Link>
          <Link
            href="/account"
            className="text-sm text-muted transition hover:text-foreground"
          >
            {profile?.display_name ?? "You"}
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 pt-8 pb-28">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
