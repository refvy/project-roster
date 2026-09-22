import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { buildMatchdayIcs } from "@/lib/ics";
import { isMatchdayLive } from "@/lib/matchday-status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const matchday = await prisma.matchday.findUnique({
    where: { publicId },
  });
  if (
    !matchday ||
    matchday.deletedAt ||
    !isMatchdayLive(matchday) ||
    !matchday.startsAt
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ics = buildMatchdayIcs({
    publicId: matchday.publicId,
    title: matchday.title,
    place: matchday.place,
    startsAt: matchday.startsAt,
    endsAt: matchday.endsAt,
    url: `${getAppUrl()}/m/${matchday.publicId}`,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="skwad-${matchday.publicId}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
