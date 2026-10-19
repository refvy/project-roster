import { isKnownPosition, parsePositions } from "./positions";
import { isMatchdayLive } from "./matchday-status";
import { normalizePersonName } from "./rsvp-name";
import { prisma } from "./prisma";
import {
  GUEST_ADD_LIMIT_MESSAGE,
  RATE_LIMIT_ERROR_MESSAGE,
  SELF_RSVP_IP_LIMIT,
  SELF_RSVP_IP_WINDOW_MS,
  ipForRateLimit,
  takeRateLimitSlot,
} from "./rate-limit";
import { RsvpStatus } from "@prisma/client";

export type SelfRsvpResult = {
  ok: boolean;
  error?: string;
  duplicate?: string;
  rateLimited?: boolean;
  revalidate?: { publicId: string; matchdayId: string };
  capture?: {
    publicId: string;
    organiserId: string;
    from: RsvpStatus | null;
    to: RsvpStatus;
  };
};

function validatePerson(name: string) {
  if (name.length < 1 || name.length > 40) {
    return "Type a name so the roster can list you.";
  }
  return null;
}

async function findGoingNameCollision(
  matchdayId: string,
  name: string,
  guestId: string,
) {
  const going = await prisma.rsvp.findMany({
    where: { matchdayId, status: "GOING" },
    select: { id: true, name: true, guestId: true },
  });
  const needle = normalizePersonName(name);
  return (
    going.find((row) => {
      if (row.guestId === guestId) return false;
      return normalizePersonName(row.name) === needle;
    }) ?? null
  );
}

export async function saveGuestRsvp(input: {
  publicId: string;
  name: string;
  status: RsvpStatus;
  positionKeyRaw: string;
  guestId: string;
  ip: string | null;
}): Promise<SelfRsvpResult> {
  const { publicId, name, status, positionKeyRaw, guestId } = input;
  if (!publicId) return { ok: false, error: "Missing matchday." };
  const nameError = validatePerson(name);
  if (nameError) return { ok: false, error: nameError };

  const matchday = await prisma.matchday.findUnique({
    where: { publicId },
  });
  if (!matchday || matchday.deletedAt) {
    return { ok: false, error: "This matchday was deleted." };
  }
  if (!isMatchdayLive(matchday)) {
    return { ok: false, error: "This match was cancelled." };
  }

  const positions = parsePositions(matchday.positions);
  const positionKey = positionKeyRaw || null;
  if (status === "GOING" && !isKnownPosition(positions, positionKey)) {
    return { ok: false, error: "Pick a position." };
  }
  if (status === "GOING") {
    const collision = await findGoingNameCollision(matchday.id, name, guestId);
    if (collision) {
      return { ok: false, duplicate: collision.name };
    }
  }

  const client = ipForRateLimit(input.ip);
  if (client) {
    try {
      const slot = await takeRateLimitSlot(
        `self-rsvp:${client}:${matchday.id}`,
        SELF_RSVP_IP_LIMIT,
        SELF_RSVP_IP_WINDOW_MS,
      );
      if (!slot.allowed) {
        return {
          ok: false,
          error: GUEST_ADD_LIMIT_MESSAGE,
          rateLimited: true,
        };
      }
    } catch (err) {
      console.error("[rate-limit] self-rsvp check failed", err);
      return { ok: false, error: RATE_LIMIT_ERROR_MESSAGE };
    }
  }

  const existing = await prisma.rsvp.findUnique({
    where: {
      matchdayId_guestId: { matchdayId: matchday.id, guestId },
    },
    select: { status: true },
  });

  await prisma.rsvp.upsert({
    where: {
      matchdayId_guestId: { matchdayId: matchday.id, guestId },
    },
    update: {
      name,
      status,
      positionKey: status === "GOING" ? positionKey : null,
      addedByGuestId: null,
      addedByName: null,
    },
    create: {
      matchdayId: matchday.id,
      guestId,
      name,
      status,
      positionKey: status === "GOING" ? positionKey : null,
    },
  });

  await prisma.rsvp.updateMany({
    where: { matchdayId: matchday.id, addedByGuestId: guestId },
    data: { addedByName: name },
  });

  return {
    ok: true,
    revalidate: { publicId, matchdayId: matchday.id },
    capture: {
      publicId: matchday.publicId,
      organiserId: matchday.organiserId,
      from: existing?.status ?? null,
      to: status,
    },
  };
}
