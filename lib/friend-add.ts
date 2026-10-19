import { isKnownPosition, parsePositions } from "./positions";
import { isMatchdayLive } from "./matchday-status";
import { normalizePersonName } from "./rsvp-name";
import { randomToken } from "./crypto";
import { prisma } from "./prisma";
import {
  GUEST_ADD_IP_LIMIT,
  GUEST_ADD_IP_WINDOW_MS,
  GUEST_ADD_LIMIT,
  GUEST_ADD_LIMIT_MESSAGE,
  GUEST_ADD_WINDOW_MS,
  RATE_LIMIT_ERROR_MESSAGE,
  ipForRateLimit,
  takeRateLimitSlot,
} from "./rate-limit";
import { RsvpStatus } from "@prisma/client";

export type FriendAddState = {
  ok: boolean;
  error?: string;
  duplicate?: string;
};

export type FriendAddResult = {
  state: FriendAddState;
  revalidate?: { publicId: string; matchdayId: string };
};

function validatePerson(name: string) {
  if (name.length < 1 || name.length > 40) {
    return "Type a name so the roster can list you.";
  }
  return null;
}

async function findGoingNameCollision(matchdayId: string, name: string) {
  const going = await prisma.rsvp.findMany({
    where: { matchdayId, status: "GOING" },
    select: { id: true, name: true, guestId: true },
  });
  const needle = normalizePersonName(name);
  return going.find((row) => normalizePersonName(row.name) === needle) ?? null;
}

export async function addFriendForGuest(input: {
  publicId: string;
  name: string;
  status: RsvpStatus;
  positionKeyRaw: string;
  ip: string | null;
  getGuestId: () => Promise<string>;
}): Promise<FriendAddResult> {
  const { publicId, name, status, positionKeyRaw } = input;
  if (!publicId) return { state: { ok: false, error: "Missing matchday." } };
  const nameError = validatePerson(name);
  if (nameError) return { state: { ok: false, error: nameError } };

  const matchday = await prisma.matchday.findUnique({
    where: { publicId },
  });
  if (!matchday || matchday.deletedAt) {
    return { state: { ok: false, error: "This matchday was deleted." } };
  }
  if (!isMatchdayLive(matchday)) {
    return { state: { ok: false, error: "This match was cancelled." } };
  }

  const guestId = await input.getGuestId();
  const self = await prisma.rsvp.findUnique({
    where: { matchdayId_guestId: { matchdayId: matchday.id, guestId } },
  });
  if (!self || self.addedByGuestId) {
    return {
      state: { ok: false, error: "Sign yourself in first, then add a friend." },
    };
  }

  const positions = parsePositions(matchday.positions);
  const positionKey = positionKeyRaw || null;
  if (status === "GOING" && !isKnownPosition(positions, positionKey)) {
    return { state: { ok: false, error: "Pick a position." } };
  }
  if (status === "GOING") {
    const collision = await findGoingNameCollision(matchday.id, name);
    if (collision) {
      return { state: { ok: false, duplicate: collision.name } };
    }
  }

  try {
    const byGuest = await takeRateLimitSlot(
      `guest-add:${guestId}:${matchday.id}`,
      GUEST_ADD_LIMIT,
      GUEST_ADD_WINDOW_MS,
    );
    if (!byGuest.allowed) {
      return { state: { ok: false, error: GUEST_ADD_LIMIT_MESSAGE } };
    }
    const clientIp = ipForRateLimit(input.ip);
    if (clientIp) {
      const byIp = await takeRateLimitSlot(
        `guest-add-ip:${clientIp}:${matchday.id}`,
        GUEST_ADD_IP_LIMIT,
        GUEST_ADD_IP_WINDOW_MS,
      );
      if (!byIp.allowed) {
        return { state: { ok: false, error: GUEST_ADD_LIMIT_MESSAGE } };
      }
    }
  } catch (err) {
    console.error("[rate-limit] guest add check failed", err);
    return { state: { ok: false, error: RATE_LIMIT_ERROR_MESSAGE } };
  }

  await prisma.rsvp.create({
    data: {
      matchdayId: matchday.id,
      guestId: `extra:${randomToken(12)}`,
      addedByGuestId: guestId,
      addedByName: self.name,
      name,
      status,
      positionKey: status === "GOING" ? positionKey : null,
    },
  });

  return {
    state: { ok: true },
    revalidate: { publicId, matchdayId: matchday.id },
  };
}
