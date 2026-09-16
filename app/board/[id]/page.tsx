import { logoutAction } from "@/app/actions/auth";
import { CoachBoard } from "@/components/CoachBoard";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ImbalanceBanner } from "@/components/ImbalanceBanner";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Wordmark } from "@/components/Wordmark";
import { getOrganiser } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";
import { describeImbalance } from "@/lib/imbalance";
import { parsePositions, sportLabel } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function OrganiserMatchdayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organiser = await getOrganiser();
  if (!organiser) redirect("/");

  const { id } = await params;
  const matchday = await prisma.matchday.findUnique({
    where: { id },
    include: { rsvps: { orderBy: { createdAt: "asc" } } },
  });
  if (!matchday || matchday.organiserId !== organiser.id) {
    notFound();
  }

  const positions = parsePositions(matchday.positions);
  const going = matchday.rsvps.filter((rsvp) => rsvp.status === "GOING");
  const imbalance = describeImbalance(going, positions, matchday.sport);
  const shareUrl = `${getAppUrl()}/m/${matchday.publicId}`;

  const counts = positions.map((position) => ({
    ...position,
    count: going.filter((rsvp) => rsvp.positionKey === position.key).length,
  }));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-8">
      <LiveRefresh />
      <header className="flex items-center justify-between gap-4">
        <Wordmark href="/board" />
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
          >
            Log out
          </button>
        </form>
      </header>
      <main className="mt-10 flex flex-col gap-8">
        <div>
          <p className="text-sm font-medium text-ink-soft">
            <Link href="/board" className="underline-offset-4 hover:underline">
              ← Matchdays
            </Link>
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
            {matchday.title}
          </h1>
          <p className="mt-2 text-lg text-ink-soft">
            {sportLabel(matchday.sport)} · {matchday.whenWhere}
          </p>
        </div>

        <CopyLinkButton url={shareUrl} />

        <CoachBoard
          sport={matchday.sport}
          going={going.map((rsvp) => ({
            id: rsvp.id,
            name: rsvp.name,
            positionKey: rsvp.positionKey,
          }))}
        />

        <ImbalanceBanner message={imbalance} />

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl tracking-tight">
              Going · {going.length}
            </h2>
            <p className="max-w-xl text-right text-sm text-ink-soft" data-testid="position-counts">
              {counts.map((item) => `${item.label} ${item.count}`).join(" · ")}
            </p>
          </div>
          {going.length === 0 ? (
            <p className="mt-6 text-ink-soft">
              Waiting on the first Going. Share the link.
            </p>
          ) : (
            <ul data-testid="roster" className="mt-6 divide-y divide-ink/10">
              {going.map((rsvp) => (
                <li
                  key={rsvp.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <span className="text-lg font-medium">{rsvp.name}</span>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold tracking-wide text-accent-deep">
                    {rsvp.positionKey ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
