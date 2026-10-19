import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  COPY_EVENT_IP_LIMIT,
  COPY_EVENT_IP_WINDOW_MS,
  COPY_EVENT_MATCH_LIMIT,
  COPY_EVENT_MATCH_WINDOW_MS,
  ipForRateLimit,
  resolveClientIp,
  takeRateLimitSlot,
} from "@/lib/rate-limit";
import { emitMatchCopy, type CopyCaptureEvent } from "@/lib/server-analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EVENTS = new Set<CopyCaptureEvent>(["invite_copied", "roster_copied"]);

function readBody(value: unknown): { event: CopyCaptureEvent; publicId: string } | null {
  if (!value || typeof value !== "object") return null;
  const event = "event" in value ? value.event : null;
  const publicId = "publicId" in value ? value.publicId : null;
  if (typeof event !== "string" || !EVENTS.has(event as CopyCaptureEvent)) {
    return null;
  }
  if (typeof publicId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(publicId)) {
    return null;
  }
  return { event: event as CopyCaptureEvent, publicId };
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const body = readBody(payload);
  if (!body) return new NextResponse(null, { status: 400 });

  const ip = ipForRateLimit(resolveClientIp(request.headers));
  try {
    if (ip) {
      const byIp = await takeRateLimitSlot(
        `copy-ip:${ip}`,
        COPY_EVENT_IP_LIMIT,
        COPY_EVENT_IP_WINDOW_MS,
      );
      if (!byIp.allowed) return new NextResponse(null, { status: 429 });
    }
  } catch (error) {
    console.error("[rate-limit] copy event check failed", error);
    return new NextResponse(null, { status: 204 });
  }

  const matchday = await prisma.matchday.findUnique({
    where: { publicId: body.publicId },
    select: {
      publicId: true,
      organiserId: true,
      sport: true,
      startsAt: true,
      hasTime: true,
      mapUrl: true,
      deletedAt: true,
      _count: { select: { rsvps: { where: { status: "GOING" } } } },
    },
  });
  if (!matchday || matchday.deletedAt) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const byMatch = await takeRateLimitSlot(
      `copy:${body.event}:${matchday.publicId}`,
      COPY_EVENT_MATCH_LIMIT,
      COPY_EVENT_MATCH_WINDOW_MS,
    );
    if (!byMatch.allowed) return new NextResponse(null, { status: 429 });
  } catch (error) {
    console.error("[rate-limit] copy event check failed", error);
    return new NextResponse(null, { status: 204 });
  }

  await emitMatchCopy(body.event, {
    publicId: matchday.publicId,
    organiserUserId: matchday.organiserId,
    sport: matchday.sport,
    startsAt: matchday.startsAt,
    hasTime: matchday.hasTime,
    mapUrl: matchday.mapUrl,
    goingCount: matchday._count.rsvps,
  });

  return new NextResponse(null, { status: 204 });
}
