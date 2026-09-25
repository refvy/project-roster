import { logoutAction } from "@/app/actions/auth";
import { AnalyticsBeacon } from "@/components/AnalyticsBeacon";
import { AnalyticsScope } from "@/components/AnalyticsScope";
import { CoachBoard } from "@/components/CoachBoard";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { CancelMatchdayButton } from "@/components/CancelMatchdayButton";
import { CompleteMatchdayButton } from "@/components/CompleteMatchdayButton";
import { DeleteMatchdayButton } from "@/components/DeleteMatchdayButton";
import { LineupsSection } from "@/components/LineupsSection";
import { ManagerGoing } from "@/components/ManagerGoing";
import { PrivacyLink } from "@/components/PrivacyLink";
import { RemovedToast } from "@/components/RemovedToast";
import { ImbalanceBanner } from "@/components/ImbalanceBanner";
import { LiveRefresh } from "@/components/LiveRefresh";
import { SportChip } from "@/components/SportChip";
import { WhenWhereLine } from "@/components/WhenWhereLine";
import { Wordmark } from "@/components/Wordmark";
import { analyticsFromMatchday } from "@/lib/analytics";
import { getOrganiser } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";
import { describeImbalance } from "@/lib/imbalance";
import { orderGoingForRoster } from "@/lib/pitch";
import { parsePositions, parseSport } from "@/lib/positions";
import { buildRosterPaste } from "@/lib/roster-paste";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function OrganiserMatchdayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const organiser = await getOrganiser();
  if (!organiser) redirect("/");

  const { id } = await params;
  const query = await searchParams;
  const matchday = await prisma.matchday.findUnique({
    where: { id },
    include: {
      rsvps: { orderBy: { createdAt: "asc" } },
      lineups: { orderBy: { createdAt: "asc" } },
    },
  });
  if (
    !matchday ||
    matchday.organiserId !== organiser.id ||
    matchday.deletedAt
  ) {
    notFound();
  }

  const positions = parsePositions(matchday.positions);
  const going = matchday.rsvps.filter((rsvp) => rsvp.status === "GOING");
  const ordered = orderGoingForRoster(going, matchday.sport, matchday.formation);
  const imbalance = describeImbalance(going, positions, matchday.sport);
  const shareUrl = `${getAppUrl()}/m/${matchday.publicId}`;

  const counts = positions.map((position) => ({
    ...position,
    count: going.filter((rsvp) => rsvp.positionKey === position.key).length,
  }));
  const rosterPaste = buildRosterPaste({
    title: matchday.title,
    startsAt: matchday.startsAt,
    endsAt: matchday.endsAt,
    hasTime: matchday.hasTime,
    venue: matchday.venue,
    place: matchday.place,
    mapUrl: matchday.mapUrl,
    going: ordered,
    positions,
  });
  const analytics = analyticsFromMatchday(matchday, going.length, "manager");

  return (
    <AnalyticsScope value={analytics}>
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-8">
      {query.created === "1" ? <AnalyticsBeacon props={analytics} /> : null}
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
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl tracking-tight md:text-5xl">
                {matchday.title}
              </h1>
              <p className="mt-2">
                <SportChip sport={matchday.sport} testId="sport-label" />
              </p>
              <WhenWhereLine
                whenWhere={matchday.whenWhere}
                startsAt={matchday.startsAt}
                endsAt={matchday.endsAt}
                hasTime={matchday.hasTime}
                venue={matchday.venue}
                place={matchday.place}
                className="mt-1 text-lg text-ink-soft"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {matchday.status === "LIVE" ? (
                <Link
                  href={`/board/${matchday.id}/edit`}
                  className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
                >
                  Edit
                </Link>
              ) : matchday.status === "CANCELLED" ? (
                <span
                  data-testid="cancelled-chip"
                  className="inline-flex rounded-full border border-ink/20 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-ink-soft"
                >
                  Cancelled
                </span>
              ) : (
                <span
                  data-testid="completed-chip"
                  className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold tracking-wide text-accent-deep"
                >
                  Completed
                </span>
              )}
              {matchday.status === "LIVE" ? (
                <>
                  <CompleteMatchdayButton matchdayId={matchday.id} />
                  <CancelMatchdayButton matchdayId={matchday.id} />
                </>
              ) : null}
              <DeleteMatchdayButton matchdayId={matchday.id} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <CopyLinkButton url={shareUrl} />
        </div>

        <CoachBoard
          matchdayId={matchday.id}
          sport={matchday.sport}
          formation={matchday.formation}
          readOnly={matchday.status !== "LIVE"}
          canRemove={matchday.status === "LIVE"}
          going={going.map((rsvp) => ({
            id: rsvp.id,
            name: rsvp.name,
            positionKey: rsvp.positionKey,
            addedByName: rsvp.addedByName,
          }))}
          out={matchday.rsvps
            .filter((rsvp) => rsvp.status === "OUT")
            .map((rsvp) => ({ id: rsvp.id, name: rsvp.name }))}
        />

        <ImbalanceBanner message={imbalance} />

        <ManagerGoing
          going={ordered}
          empty="Waiting on the first Going. Share the link."
          canRemove={matchday.status === "LIVE"}
          matchdayId={matchday.id}
          rosterPaste={rosterPaste}
          counts={counts.map((item) => `${item.label} ${item.count}`).join(" · ")}
        />

        {parseSport(matchday.sport) === "football" ? (
          <LineupsSection
            matchdayId={matchday.id}
            canEdit={matchday.status === "LIVE"}
            going={ordered.map((rsvp) => ({
              id: rsvp.id,
              name: rsvp.name,
              positionKey: rsvp.positionKey,
            }))}
            lineups={matchday.lineups.map((row) => ({
              id: row.id,
              name: row.name,
              formation: row.formation,
              slots: row.slots,
              bench: row.bench,
            }))}
          />
        ) : null}
      </main>
      <PrivacyLink />
      <RemovedToast />
    </div>
    </AnalyticsScope>
  );
}
