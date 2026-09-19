import { AddFriendPanel } from "@/components/AddFriendPanel";
import { CoachBoard } from "@/components/CoachBoard";
import { GuestRsvpForm } from "@/components/GuestRsvpForm";
import { GoingList } from "@/components/GoingList";
import { SportChip } from "@/components/SportChip";
import { WhenWhereLine } from "@/components/WhenWhereLine";
import { Wordmark } from "@/components/Wordmark";
import { getGuestId, getRememberedGuestName } from "@/lib/auth";
import { orderGoingForRoster } from "@/lib/pitch";
import { parsePositions } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import { matchdaySharePulse, ogImageUrl } from "@/lib/share-pulse";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  const matchday = await prisma.matchday.findUnique({
    where: { publicId },
    include: { rsvps: { select: { status: true, positionKey: true } } },
  });
  if (!matchday || matchday.deletedAt) {
    return { title: "Matchday" };
  }
  if (matchday.status === "CANCELLED") {
    return { title: { absolute: "This match was cancelled" } };
  }
  if (matchday.status === "COMPLETED") {
    return { title: { absolute: "Match completed" } };
  }
  const pulse = matchdaySharePulse(matchday);
  const title = pulse.title;
  const description = pulse.body;
  const image = ogImageUrl(publicId, matchday.ogBust);
  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      siteName: "Skwad",
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: "Matchday — powered by SKWAD",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function GuestMatchdayPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const matchday = await prisma.matchday.findUnique({
    where: { publicId },
    include: { rsvps: { orderBy: { createdAt: "asc" } } },
  });
  if (!matchday) notFound();

  if (matchday.deletedAt) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-8">
        <header>
          <Wordmark href="/board" />
        </header>
        <main className="mt-16" data-testid="matchday-gone">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Matchday
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight">
            This matchday was deleted
          </h1>
          <p className="mt-3 text-lg text-ink-soft">
            The share link is no longer active.
          </p>
        </main>
      </div>
    );
  }

  if (matchday.status === "CANCELLED") {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-8">
        <header>
          <Wordmark href="/board" />
        </header>
        <main className="mt-16" data-testid="matchday-cancelled">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Matchday
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight">
            This match was cancelled
          </h1>
          <WhenWhereLine
            value={matchday.whenWhere}
            className="mt-3 text-lg text-ink/40"
          />
          <p className="mt-4 text-lg text-ink-soft">
            Ask your captain if there’s a new date.
          </p>
        </main>
      </div>
    );
  }

  const going = orderGoingForRoster(
    matchday.rsvps
      .filter((rsvp) => rsvp.status === "GOING")
      .map((rsvp) => ({
        id: rsvp.id,
        name: rsvp.name,
        positionKey: rsvp.positionKey,
        addedByName: rsvp.addedByName,
      })),
    matchday.sport,
    matchday.formation,
  );

  if (matchday.status === "COMPLETED") {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-8">
        <header>
          <Wordmark href="/board" />
        </header>
        <main className="mt-12 flex flex-col gap-10" data-testid="matchday-completed">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Matchday
            </p>
            <h1 className="mt-3 font-display text-4xl tracking-tight">
              Match completed
            </h1>
            <p className="mt-2">
              <SportChip sport={matchday.sport} testId="sport-label" />
            </p>
            <WhenWhereLine
              value={matchday.whenWhere}
              className="mt-3 text-lg text-ink/40"
            />
          </div>
          <CoachBoard
            matchdayId={matchday.id}
            sport={matchday.sport}
            formation={matchday.formation}
            going={going}
            out={matchday.rsvps
              .filter((rsvp) => rsvp.status === "OUT")
              .map((rsvp) => ({ id: rsvp.id, name: rsvp.name }))}
            readOnly
          />
          <section>
            <h2 className="font-display text-2xl tracking-tight">
              Going · {going.length}
            </h2>
            <GoingList going={going} empty="No one went." />
          </section>
        </main>
      </div>
    );
  }

  const positions = parsePositions(matchday.positions);
  const guestId = await getGuestId();
  const rememberedName = await getRememberedGuestName();
  const existing = guestId
    ? matchday.rsvps.find((rsvp) => rsvp.guestId === guestId) ?? null
    : null;
  const extras = guestId
    ? matchday.rsvps.filter((rsvp) => rsvp.addedByGuestId === guestId)
    : [];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-8">
      <header>
        <Wordmark href="/board" />
      </header>
      <main className="mt-12 flex flex-col gap-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Matchday
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
            {matchday.title}
          </h1>
          <p
            data-testid="signup-helper"
            className="mt-2 text-sm text-ink-soft"
          >
            No app. Pick a spot and tap Done.
          </p>
          <p className="mt-2">
            <SportChip sport={matchday.sport} testId="sport-label" />
          </p>
          <WhenWhereLine
            value={matchday.whenWhere}
            className="mt-1 text-lg text-ink-soft"
          />
        </div>
        <GuestRsvpForm
          publicId={publicId}
          sport={matchday.sport}
          positions={positions}
          defaultName={existing?.name || rememberedName}
          defaultStatus={existing?.status ?? "GOING"}
          defaultPosition={existing?.positionKey ?? null}
          confirmed={Boolean(existing)}
        />
        {existing ? (
          <AddFriendPanel
            publicId={publicId}
            sport={matchday.sport}
            positions={positions}
            extras={extras.map((extra) => ({
              id: extra.id,
              name: extra.name,
              status: extra.status,
              positionKey: extra.positionKey,
            }))}
          />
        ) : null}
        <section>
          <h2 className="font-display text-2xl tracking-tight">
            Going · {going.length}
          </h2>
          <GoingList going={going} empty="No one Going yet." />
        </section>
      </main>
    </div>
  );
}
