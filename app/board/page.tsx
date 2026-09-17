import { logoutAction } from "@/app/actions/auth";
import { SportChip } from "@/components/SportChip";
import { Wordmark } from "@/components/Wordmark";
import { getGuestId, getOrganiser } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type MatchdayRow = {
  id: string;
  publicId: string;
  title: string;
  whenWhere: string;
  sport: string;
  going: number;
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const organiser = await getOrganiser();
  const guestId = await getGuestId();
  const { tab: tabParam } = await searchParams;
  const tab =
    tabParam === "invited" || tabParam === "hosting"
      ? tabParam
      : organiser
        ? "hosting"
        : "invited";

  const hosted = organiser
    ? await prisma.matchday.findMany({
        where: { organiserId: organiser.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { rsvps: { where: { status: "GOING" } } },
          },
        },
      })
    : [];

  const invitedRecords = guestId
    ? await prisma.matchday.findMany({
        where: {
          deletedAt: null,
          ...(organiser ? { organiserId: { not: organiser.id } } : {}),
          rsvps: { some: { guestId } },
        },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { rsvps: { where: { status: "GOING" } } },
          },
        },
      })
    : [];

  const hostingRows: MatchdayRow[] = hosted.map((matchday) => ({
    id: matchday.id,
    publicId: matchday.publicId,
    title: matchday.title,
    whenWhere: matchday.whenWhere,
    sport: matchday.sport,
    going: matchday._count.rsvps,
  }));
  const invitedRows: MatchdayRow[] = invitedRecords.map((matchday) => ({
    id: matchday.id,
    publicId: matchday.publicId,
    title: matchday.title,
    whenWhere: matchday.whenWhere,
    sport: matchday.sport,
    going: matchday._count.rsvps,
  }));

  const rows = tab === "invited" ? invitedRows : hostingRows;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <Wordmark href="/board" />
        {organiser ? (
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
            >
              Log out
            </button>
          </form>
        ) : (
          <Link
            href="/"
            className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
          >
            Organise
          </Link>
        )}
      </header>
      <main className="mt-12">
        {organiser ? (
          <p className="text-sm text-ink-soft">{organiser.email}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl tracking-tight">Matchdays</h1>
          {organiser ? (
            <Link
              href="/board/new"
              className="inline-flex min-h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-deep"
            >
              + New matchday
            </Link>
          ) : null}
        </div>

        <nav
          data-testid="home-tabs"
          className="mt-8 flex gap-6 border-b border-ink/10"
          aria-label="Matchdays"
        >
          <Link
            href="/board?tab=invited"
            data-testid="tab-invited"
            aria-current={tab === "invited" ? "page" : undefined}
            className={`border-b-2 pb-2 text-sm ${
              tab === "invited"
                ? "border-accent font-semibold text-ink"
                : "border-transparent font-medium text-ink-soft hover:text-ink"
            }`}
          >
            Invited
          </Link>
          <Link
            href="/board?tab=hosting"
            data-testid="tab-hosting"
            aria-current={tab === "hosting" ? "page" : undefined}
            className={`border-b-2 pb-2 text-sm ${
              tab === "hosting"
                ? "border-accent font-semibold text-ink"
                : "border-transparent font-medium text-ink-soft hover:text-ink"
            }`}
          >
            Hosting
          </Link>
        </nav>

        {rows.length === 0 ? (
          <p className="mt-10 text-ink-soft">
            {tab === "invited"
              ? "No matchdays you’ve joined yet. Open an invitation link to appear here."
              : organiser
                ? "No matchdays yet. Create one and copy the invitation link."
                : "Sign in with a magic link to host a matchday."}
          </p>
        ) : (
          <ul className="mt-4">
            {rows.map((matchday) => (
              <li key={matchday.id} className="border-b border-ink/10">
                <Link
                  href={
                    tab === "hosting"
                      ? `/board/${matchday.id}`
                      : `/m/${matchday.publicId}`
                  }
                  data-testid="matchday-card"
                  className="block cursor-pointer rounded-2xl px-3 py-5 transition hover:-translate-y-0.5 hover:bg-surface hover:shadow-[0_10px_28px_-18px_rgb(26,23,20,0.45)] active:translate-y-0 active:bg-cream-deep"
                >
                  <SportChip sport={matchday.sport} />
                  <p className="mt-2 font-display text-2xl tracking-tight">
                    {matchday.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {matchday.whenWhere} · {matchday.going} going
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
