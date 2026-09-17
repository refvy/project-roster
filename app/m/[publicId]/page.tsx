import { AddFriendPanel } from "@/components/AddFriendPanel";
import { GuestRsvpForm } from "@/components/GuestRsvpForm";
import { GoingList } from "@/components/GoingList";
import { SportChip } from "@/components/SportChip";
import { Wordmark } from "@/components/Wordmark";
import { getGuestId, getRememberedGuestName } from "@/lib/auth";
import { orderGoingForRoster } from "@/lib/pitch";
import { parsePositions } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
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
    select: { title: true, deletedAt: true, whenWhere: true },
  });
  if (!matchday || matchday.deletedAt) {
    return { title: "Matchday" };
  }
  const title = `Signup now for ${matchday.title} — powered by SKWAD`;
  const description = matchday.whenWhere;
  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      siteName: "Skwad",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

  const positions = parsePositions(matchday.positions);
  const guestId = await getGuestId();
  const rememberedName = await getRememberedGuestName();
  const existing = guestId
    ? matchday.rsvps.find((rsvp) => rsvp.guestId === guestId) ?? null
    : null;
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
          <p className="mt-2">
            <SportChip sport={matchday.sport} testId="sport-label" />
          </p>
          <p className="mt-1 text-lg text-ink-soft">{matchday.whenWhere}</p>
        </div>
        <GuestRsvpForm
          publicId={publicId}
          positions={positions}
          defaultName={existing?.name || rememberedName}
          defaultStatus={existing?.status ?? "GOING"}
          defaultPosition={existing?.positionKey ?? null}
          confirmed={Boolean(existing)}
        />
        {existing ? (
          <AddFriendPanel
            publicId={publicId}
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
