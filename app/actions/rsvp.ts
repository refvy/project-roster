"use server";

import { revalidatePath } from "next/cache";
import {
  getOrCreateGuestId,
  rememberGuestName,
} from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { isKnownPosition, parsePositions } from "@/lib/positions";
import { isMatchdayLive } from "@/lib/matchday-status";
import { prisma } from "@/lib/prisma";
import { RsvpStatus } from "@prisma/client";

export type RsvpState = {
  ok: boolean;
  error?: string;
} | null;

function readRsvpFields(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "GOING");
  const positionKeyRaw = String(formData.get("position") ?? "").trim();
  const status: RsvpStatus = statusRaw === "OUT" ? "OUT" : "GOING";
  return { publicId, name, status, positionKeyRaw };
}

function validatePerson(name: string) {
  if (name.length < 1 || name.length > 40) {
    return "Type a name so the roster can list you.";
  }
  return null;
}

export async function submitRsvp(
  _prev: RsvpState,
  formData: FormData,
): Promise<NonNullable<RsvpState>> {
  const { publicId, name, status, positionKeyRaw } = readRsvpFields(formData);
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

  const guestId = await getOrCreateGuestId();
  await rememberGuestName(name);

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

  revalidatePath(`/m/${publicId}`);
  revalidatePath(`/board/${matchday.id}`);
  return { ok: true };
}

export async function addFriendRsvp(
  _prev: RsvpState,
  formData: FormData,
): Promise<NonNullable<RsvpState>> {
  const { publicId, name, status, positionKeyRaw } = readRsvpFields(formData);
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

  const guestId = await getOrCreateGuestId();
  const self = await prisma.rsvp.findUnique({
    where: { matchdayId_guestId: { matchdayId: matchday.id, guestId } },
  });
  if (!self || self.addedByGuestId) {
    return { ok: false, error: "Sign yourself in first, then add a friend." };
  }

  const positions = parsePositions(matchday.positions);
  const positionKey = positionKeyRaw || null;
  if (status === "GOING" && !isKnownPosition(positions, positionKey)) {
    return { ok: false, error: "Pick a position." };
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

  revalidatePath(`/m/${publicId}`);
  revalidatePath(`/board/${matchday.id}`);
  return { ok: true };
}

export async function updateFriendRsvp(
  _prev: RsvpState,
  formData: FormData,
): Promise<NonNullable<RsvpState>> {
  const { publicId, name, status, positionKeyRaw } = readRsvpFields(formData);
  const extraId = String(formData.get("extraId") ?? "").trim();
  if (!publicId || !extraId) return { ok: false, error: "Missing matchday." };
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

  const guestId = await getOrCreateGuestId();
  const extra = await prisma.rsvp.findUnique({ where: { id: extraId } });
  if (
    !extra ||
    extra.matchdayId !== matchday.id ||
    extra.addedByGuestId !== guestId
  ) {
    return { ok: false, error: "You can only edit people you added." };
  }

  const positions = parsePositions(matchday.positions);
  const positionKey = positionKeyRaw || null;
  if (status === "GOING" && !isKnownPosition(positions, positionKey)) {
    return { ok: false, error: "Pick a position." };
  }

  await prisma.rsvp.update({
    where: { id: extra.id },
    data: {
      name,
      status,
      positionKey: status === "GOING" ? positionKey : null,
    },
  });

  revalidatePath(`/m/${publicId}`);
  revalidatePath(`/board/${matchday.id}`);
  return { ok: true };
}

export async function deleteFriendRsvp(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "").trim();
  const extraId = String(formData.get("extraId") ?? "").trim();
  if (!publicId || !extraId) return;

  const matchday = await prisma.matchday.findUnique({
    where: { publicId },
  });
  if (!matchday || matchday.deletedAt || !isMatchdayLive(matchday)) return;

  const guestId = await getOrCreateGuestId();
  const extra = await prisma.rsvp.findUnique({ where: { id: extraId } });
  if (
    !extra ||
    extra.matchdayId !== matchday.id ||
    extra.addedByGuestId !== guestId
  ) {
    return;
  }

  await prisma.rsvp.delete({ where: { id: extra.id } });
  revalidatePath(`/m/${publicId}`);
  revalidatePath(`/board/${matchday.id}`);
}
