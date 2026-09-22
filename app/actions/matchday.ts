"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrganiser } from "@/lib/auth";
import { publicId } from "@/lib/crypto";
import { getAppUrl } from "@/lib/env";
import { isMatchdayLive } from "@/lib/matchday-status";
import { parseFormation } from "@/lib/pitch";
import { parseSport, positionsForSport } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import {
  matchdaySharePulse,
  nextOgBust,
  shareUpdateText,
  shareUpdateUrl,
} from "@/lib/share-pulse";
import {
  bangkokDateTimeToUtc,
} from "@/lib/when-where";
import type { Prisma } from "@prisma/client";

export type MatchdayFormState = {
  error?: string;
} | null;

async function requireOrganiser() {
  const organiser = await getOrganiser();
  if (!organiser) redirect("/");
  return organiser;
}

function readMatchdayFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const whenWhere = String(formData.get("whenWhere") ?? "").trim();
  const place = String(formData.get("place") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const sport = parseSport(formData.get("sport"));
  const formation =
    sport === "basketball" ? "4-3-3" : parseFormation(formData.get("formation"));
  return {
    title,
    whenWhere,
    place,
    startDate,
    startTime,
    endTime,
    sport,
    formation,
  };
}

function validateFields(input: {
  title: string;
  whenWhere: string;
  startDate: string;
  startTime: string;
  endTime: string;
  place: string;
}):
  | { ok: false; error: string }
  | { ok: true; startsAt: Date | null; endsAt: Date | null } {
  if (input.title.length < 2 || input.title.length > 80) {
    return { ok: false, error: "Give this matchday a short title." };
  }
  if (input.whenWhere && (input.whenWhere.length < 2 || input.whenWhere.length > 200)) {
    return { ok: false, error: "When and where as plain text — no booking needed." };
  }
  if (input.place.length > 120) {
    return { ok: false, error: "Keep the place short." };
  }

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  if (input.startDate || input.startTime) {
    if (!input.startDate || !input.startTime) {
      return { ok: false, error: "Date and start time go together — or leave both empty for TBD." };
    }
    startsAt = bangkokDateTimeToUtc(input.startDate, input.startTime);
    if (!startsAt) {
      return { ok: false, error: "That date and time don’t look right." };
    }
    if (input.endTime) {
      endsAt = bangkokDateTimeToUtc(input.startDate, input.endTime);
      if (!endsAt) {
        return { ok: false, error: "That end time doesn’t look right." };
      }
      if (endsAt.getTime() <= startsAt.getTime()) {
        return { ok: false, error: "End time must be after start." };
      }
    }
  } else if (input.endTime) {
    return { ok: false, error: "Add a date and start time before an end time." };
  }
  return { ok: true, startsAt, endsAt };
}

export async function createMatchday(
  _prev: MatchdayFormState,
  formData: FormData,
): Promise<NonNullable<MatchdayFormState>> {
  const organiser = await requireOrganiser();
  const fields = readMatchdayFields(formData);
  const checked = validateFields(fields);
  if (!checked.ok) return { error: checked.error };

  const matchday = await prisma.matchday.create({
    data: {
      publicId: publicId(),
      organiserId: organiser.id,
      title: fields.title,
      whenWhere: fields.whenWhere,
      place: fields.place || null,
      startsAt: checked.startsAt,
      endsAt: checked.endsAt,
      sport: fields.sport,
      formation: fields.formation,
      positions: positionsForSport(fields.sport) as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/board");
  redirect(`/board/${matchday.id}`);
}

export async function updateMatchday(
  _prev: MatchdayFormState,
  formData: FormData,
): Promise<NonNullable<MatchdayFormState>> {
  const organiser = await requireOrganiser();
  const id = String(formData.get("id") ?? "").trim();
  const fields = readMatchdayFields(formData);
  const checked = validateFields(fields);
  if (!checked.ok) return { error: checked.error };

  const matchday = await prisma.matchday.findFirst({
    where: { id, organiserId: organiser.id, deletedAt: null },
  });
  if (!matchday) redirect("/board");
  if (!isMatchdayLive(matchday)) redirect(`/board/${matchday.id}`);

  await prisma.matchday.update({
    where: { id: matchday.id },
    data: {
      title: fields.title,
      whenWhere: fields.whenWhere,
      place: fields.place || null,
      startsAt: checked.startsAt,
      endsAt: checked.endsAt,
      sport: fields.sport,
      formation: fields.formation,
      positions: positionsForSport(fields.sport) as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/board");
  revalidatePath(`/board/${matchday.id}`);
  revalidatePath(`/m/${matchday.publicId}`);
  redirect(`/board/${matchday.id}`);
}

export async function saveMatchdayFormation(
  matchdayId: string,
  formation: string,
) {
  const organiser = await getOrganiser();
  if (!organiser) return;
  const parsed = parseFormation(formation);
  const matchday = await prisma.matchday.findFirst({
    where: { id: matchdayId, organiserId: organiser.id, deletedAt: null },
  });
  if (!matchday) return;
  if (!isMatchdayLive(matchday)) return;
  if (matchday.sport === "basketball") return;

  await prisma.matchday.update({
    where: { id: matchday.id },
    data: { formation: parsed },
  });
  revalidatePath(`/board/${matchday.id}`);
  revalidatePath(`/m/${matchday.publicId}`);
}

export async function deleteMatchday(formData: FormData) {
  const organiser = await requireOrganiser();
  const id = String(formData.get("id") ?? "").trim();
  const matchday = await prisma.matchday.findFirst({
    where: { id, organiserId: organiser.id, deletedAt: null },
  });
  if (!matchday) redirect("/board");

  await prisma.matchday.update({
    where: { id: matchday.id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/board");
  revalidatePath(`/board/${matchday.id}`);
  revalidatePath(`/m/${matchday.publicId}`);
  redirect("/board");
}

export async function cancelMatchday(formData: FormData) {
  const organiser = await requireOrganiser();
  const id = String(formData.get("id") ?? "").trim();
  const matchday = await prisma.matchday.findFirst({
    where: { id, organiserId: organiser.id, deletedAt: null },
  });
  if (!matchday) redirect("/board");
  if (!isMatchdayLive(matchday)) redirect("/board");

  await prisma.matchday.update({
    where: { id: matchday.id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/board");
  revalidatePath(`/board/${matchday.id}`);
  revalidatePath(`/m/${matchday.publicId}`);
  redirect("/board");
}

export async function completeMatchday(formData: FormData) {
  const organiser = await requireOrganiser();
  const id = String(formData.get("id") ?? "").trim();
  const matchday = await prisma.matchday.findFirst({
    where: { id, organiserId: organiser.id, deletedAt: null },
  });
  if (!matchday) redirect("/board");
  if (!isMatchdayLive(matchday)) redirect(`/board/${matchday.id}`);

  await prisma.matchday.update({
    where: { id: matchday.id },
    data: { status: "COMPLETED" },
  });

  revalidatePath("/board");
  revalidatePath(`/board/${matchday.id}`);
  revalidatePath(`/m/${matchday.publicId}`);
  redirect("/board");
}

export async function bumpSharePulse(matchdayId: string) {
  const organiser = await getOrganiser();
  if (!organiser) return { ok: false as const };

  const matchday = await prisma.matchday.findFirst({
    where: {
      id: matchdayId,
      organiserId: organiser.id,
      deletedAt: null,
    },
    include: {
      rsvps: { select: { status: true, positionKey: true } },
    },
  });
  if (!matchday || !isMatchdayLive(matchday)) {
    return { ok: false as const };
  }

  const ogBust = nextOgBust();
  await prisma.matchday.update({
    where: { id: matchday.id },
    data: { ogBust },
  });

  revalidatePath(`/board/${matchday.id}`);
  revalidatePath(`/m/${matchday.publicId}`);

  const pulse = matchdaySharePulse(matchday);
  const url = shareUpdateUrl(getAppUrl(), matchday.publicId, ogBust);
  return {
    ok: true as const,
    url,
    title: pulse.title,
    body: pulse.body,
    text: shareUpdateText(pulse.title, pulse.body, url),
  };
}
