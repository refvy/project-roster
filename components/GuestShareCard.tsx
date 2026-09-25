import { CoachBoard } from "@/components/CoachBoard";
import type { GoingPlayer } from "@/lib/pitch";
import { shareCardWhenLine } from "@/lib/when-where";

export function GuestShareCard({
  title,
  sport,
  formation,
  going,
  matchdayId,
  startsAt,
  endsAt,
  hasTime,
}: {
  title: string;
  sport: string;
  formation: string;
  going: GoingPlayer[];
  matchdayId: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  hasTime?: boolean | null;
}) {
  const whenLine = shareCardWhenLine({ startsAt, endsAt, hasTime });
  return (
    <section
      data-testid="share-card"
      className="flex max-h-[560px] w-full flex-col rounded-3xl bg-cream p-4 ring-1 ring-ink/10"
    >
      <p
        data-testid="share-card-title"
        className="font-display line-clamp-2 text-center text-[1.375rem] leading-tight tracking-tight sm:text-2xl"
      >
        {title}
      </p>
      {whenLine ? (
        <p
          data-testid="share-card-when"
          className="mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-center text-[14px] leading-none"
          style={{ color: "#6B7280" }}
        >
          {whenLine}
        </p>
      ) : null}
      <div
        data-testid="share-card-board"
        className={`${whenLine ? "mt-2" : "mt-3"} min-h-0 w-full flex-1`}
      >
        <CoachBoard
          matchdayId={matchdayId}
          sport={sport}
          formation={formation}
          going={going}
          share
        />
      </div>
      <div
        data-testid="share-card-footer"
        className="mt-2.5 flex flex-nowrap items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap text-[13px] leading-none"
        style={{ color: "#6B7280" }}
      >
        <span>Powered by</span>
        <img
          src="/skwad-header.png"
          alt=""
          data-testid="share-card-mark"
          width={47}
          height={13}
          className="h-[13px] w-auto shrink-0"
          draggable={false}
        />
      </div>
    </section>
  );
}
