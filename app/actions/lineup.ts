"use server";

import { revalidatePath } from "next/cache";
import { getOrganiser } from "@/lib/auth";
import {
  LINEUP_CAP,
  parseLineupFormation,
  parseLineupSlots,
  snapshotBench,
  type LineupSlotSnap,
} from "@/lib/lineup";
import { isMatchdayLive } from "@/lib/matchday-status";
import { parseSport } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type LineupState = { error?: string } | null;

async function requireOwnedLiveFootball(matchdayId: string) {
  const organiser = await getOrganiser();
  if (!organiser) return { ok: false as const, error: "Sign in to manage lineups." };
  const matchday = await prisma.matchday.findFirst({
    where: { id: matchdayId, organiserId: organiser.id, deletedAt: null },
    include: { rsvps: true, lineups: true },
  });
  if (!matchday) return { ok: false as const, error: "That matchday isn’t here." };
  if (!isMatchdayLive(matchday)) {
    return { ok: false as const, error: "Lineups lock when the match isn’t live." };
  }
  if (parseSport(matchday.sport) !== "football") {
    return { ok: false as const, error: "Lineups are football-only for now." };
  }
  return { ok: true as const, matchday };
}

function readSlots(raw: string, going: { id: string; name: string }[]): LineupSlotSnap[] {
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = [];
  }
  const goingById = new Map(going.map((row) => [row.id, row]));
  return parseLineupSlots(parsed).map((slot) => {
    if (!slot.rsvpId) return { ...slot, rsvpId: null, name: null };
    const live = goingById.get(slot.rsvpId);
    if (!live) return { ...slot, rsvpId: null, name: null };
    return { ...slot, rsvpId: live.id, name: live.name };
  });
}

export async function createLineup(
  _prev: LineupState,
  formData: FormData,
): Promise<NonNullable<LineupState>> {
  const matchdayId = String(formData.get("matchdayId") ?? "").trim();
  const owned = await requireOwnedLiveFootball(matchdayId);
  if (!owned.ok) return { error: owned.error };
  if (owned.matchday.lineups.length >= LINEUP_CAP) {
    return { error: "Four lineups is the cap for one match." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 20) {
    return { error: "Give this lineup a short name." };
  }
  const formation = parseLineupFormation(formData.get("formation"));
  const going = owned.matchday.rsvps
    .filter((rsvp) => rsvp.status === "GOING")
    .map((rsvp) => ({ id: rsvp.id, name: rsvp.name, positionKey: rsvp.positionKey }));
  const slots = readSlots(String(formData.get("slots") ?? "[]"), going);
  const bench = snapshotBench(going, slots);

  await prisma.lineup.create({
    data: {
      matchdayId: owned.matchday.id,
      name,
      formation,
      slots: slots as unknown as Prisma.InputJsonValue,
      bench: bench as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/board/${owned.matchday.id}`);
  return {};
}

export async function updateLineup(
  _prev: LineupState,
  formData: FormData,
): Promise<NonNullable<LineupState>> {
  const matchdayId = String(formData.get("matchdayId") ?? "").trim();
  const lineupId = String(formData.get("lineupId") ?? "").trim();
  const owned = await requireOwnedLiveFootball(matchdayId);
  if (!owned.ok) return { error: owned.error };
  const lineup = owned.matchday.lineups.find((row) => row.id === lineupId);
  if (!lineup) return { error: "That lineup isn’t here." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 20) {
    return { error: "Give this lineup a short name." };
  }
  const formation = parseLineupFormation(formData.get("formation"));
  const going = owned.matchday.rsvps
    .filter((rsvp) => rsvp.status === "GOING")
    .map((rsvp) => ({ id: rsvp.id, name: rsvp.name, positionKey: rsvp.positionKey }));
  const slots = readSlots(String(formData.get("slots") ?? "[]"), going);
  const bench = snapshotBench(going, slots);

  await prisma.lineup.update({
    where: { id: lineup.id },
    data: {
      name,
      formation,
      slots: slots as unknown as Prisma.InputJsonValue,
      bench: bench as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/board/${owned.matchday.id}`);
  return {};
}

export async function deleteLineup(formData: FormData) {
  const matchdayId = String(formData.get("matchdayId") ?? "").trim();
  const lineupId = String(formData.get("lineupId") ?? "").trim();
  const owned = await requireOwnedLiveFootball(matchdayId);
  if (!owned.ok) return;
  const lineup = owned.matchday.lineups.find((row) => row.id === lineupId);
  if (!lineup) return;
  await prisma.lineup.delete({ where: { id: lineup.id } });
  revalidatePath(`/board/${owned.matchday.id}`);
}
