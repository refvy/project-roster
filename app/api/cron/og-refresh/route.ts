import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { isAuthDebug } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { nextOgBust } from "@/lib/share-pulse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 5am Asia/Bangkok (22:00 UTC) sugar: bump ogBust on LIVE matchdays so the
 * next LINE paste can recrawl. Does not ping LINE.
 */
function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const auth = request.headers.get("authorization") ?? "";
  if (secret) {
    const expected = Buffer.from(`Bearer ${secret}`);
    const got = Buffer.from(auth);
    if (expected.length !== got.length) return false;
    return timingSafeEqual(expected, got);
  }
  if (process.env.VERCEL_ENV === "production") return false;
  return isAuthDebug();
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const ogBust = nextOgBust();
  const result = await prisma.matchday.updateMany({
    where: { deletedAt: null, status: "LIVE" },
    data: { ogBust },
  });

  return NextResponse.json({
    ok: true,
    updated: result.count,
    ogBust,
  });
}
