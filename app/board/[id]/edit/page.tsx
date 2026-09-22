import { updateMatchday } from "@/app/actions/matchday";
import { MatchdayForm } from "@/components/MatchdayForm";
import { Wordmark } from "@/components/Wordmark";
import { getOrganiser } from "@/lib/auth";
import { parseFormation } from "@/lib/pitch";
import { parseSport } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import { snapToQuarter } from "@/lib/time-options";
import { utcToBangkokParts } from "@/lib/when-where";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditMatchdayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organiser = await getOrganiser();
  if (!organiser) redirect("/");

  const { id } = await params;
  const matchday = await prisma.matchday.findUnique({ where: { id } });
  if (
    !matchday ||
    matchday.organiserId !== organiser.id ||
    matchday.deletedAt
  ) {
    notFound();
  }
  if (matchday.status !== "LIVE") {
    redirect(`/board/${matchday.id}`);
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-8">
      <header>
        <Wordmark href="/board" />
      </header>
      <main className="mt-12">
        <p className="text-sm font-medium text-ink-soft">
          <Link
            href={`/board/${matchday.id}`}
            className="underline-offset-4 hover:underline"
          >
            ← {matchday.title}
          </Link>
        </p>
        <h1 className="mt-4 font-display text-4xl tracking-tight">
          Edit matchday
        </h1>
        <p className="mt-2 mb-8 text-ink-soft">
          Title, sport, date, time, place, and formation. No venue booking.
        </p>
        <MatchdayForm
          action={updateMatchday}
          submitLabel="Save"
          pendingLabel="Saving…"
          includeFormation
          defaults={{
            id: matchday.id,
            title: matchday.title,
            whenWhere: matchday.whenWhere,
            venue: matchday.venue ?? matchday.place ?? "",
            mapUrl: matchday.mapUrl ?? "",
            startDate: matchday.startsAt
              ? utcToBangkokParts(matchday.startsAt).date
              : "",
            startTime:
              matchday.startsAt && matchday.hasTime
                ? snapToQuarter(utcToBangkokParts(matchday.startsAt).time)
                : "",
            endTime: matchday.endsAt
              ? snapToQuarter(utcToBangkokParts(matchday.endsAt).time)
              : "",
            sport: parseSport(matchday.sport),
            formation: parseFormation(matchday.formation),
          }}
        />
      </main>
    </div>
  );
}
