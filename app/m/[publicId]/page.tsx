import { GuestRsvpForm } from "@/components/GuestRsvpForm";
import { Wordmark } from "@/components/Wordmark";
import { getGuestId, getRememberedGuestName } from "@/lib/auth";
import { parsePositions } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function GuestMatchdayPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const matchday = await prisma.matchday.findUnique({
    where: { publicId },
  });
  if (!matchday) notFound();

  const positions = parsePositions(matchday.positions);
  const guestId = await getGuestId();
  const rememberedName = await getRememberedGuestName();
  const existing = guestId
    ? await prisma.rsvp.findUnique({
        where: { matchdayId_guestId: { matchdayId: matchday.id, guestId } },
      })
    : null;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-8">
      <header>
        <Wordmark href={`/m/${publicId}`} />
      </header>
      <main className="mt-12 flex flex-col gap-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cobalt">
            Matchday
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
            {matchday.title}
          </h1>
          <p className="mt-3 text-lg text-ink-soft">{matchday.whenWhere}</p>
        </div>
        <GuestRsvpForm
          publicId={publicId}
          positions={positions}
          defaultName={existing?.name || rememberedName}
          defaultStatus={existing?.status ?? "GOING"}
          defaultPosition={existing?.positionKey ?? null}
          confirmed={Boolean(existing)}
        />
      </main>
    </div>
  );
}
