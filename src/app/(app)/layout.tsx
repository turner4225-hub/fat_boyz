import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

/** Shared shell for every signed-in page: requires auth + shows the header. */
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">
              {profile?.display_name ?? "You"}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-card"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
