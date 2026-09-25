"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrganiser } from "@/lib/auth";
import { publicId } from "@/lib/crypto";
import { isMatchdayLive } from "@/lib/matchday-status";
import { parseFormation } from "@/lib/pitch";
import { parseSport, positionsForSport } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import { parseMapUrl } from "@/lib/map-url";
import { addCalendarDays, isQuarterTime } from "@/lib/time-options";
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
  const venue = String(
    formData.get("venue") ?? formData.get("place") ?? "",
  ).trim();
  const mapUrl = String(formData.get("mapUrl") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const sport = parseSport(formData.get("sport"));
  const formation =
    sport === "basketball" ? "4-3-3" : parseFormation(formData.get("formation"));
  return {
    title,
    whenWhere,
    venue,
    mapUrl,
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
  venue: string;
  mapUrl: string;
}):
  | { ok: false; error: string }
  | {
      ok: true;
      startsAt: Date | null;
      endsAt: Date | null;
      hasTime: boolean;
      mapUrl: string | null;
    } {
  if (input.title.length < 2 || input.title.length > 80) {
    return { ok: false, error: "Give this matchday a short title." };
  }
  if (input.whenWhere && (input.whenWhere.length < 2 || input.whenWhere.length > 200)) {
    return { ok: false, error: "When and where as plain text — no booking needed." };
  }
  if (input.venue.length > 120) {
    return { ok: false, error: "Keep the venue short." };
  }
  const map = parseMapUrl(input.mapUrl);
  if (!map.ok) return { ok: false, error: map.error };
  if (map.url && !input.venue) {
    return { ok: false, error: "Add a venue." };
  }
  if (map.url && map.url.length > 500) {
    return { ok: false, error: "Keep the map link short." };
  }

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  let hasTime = false;
  if (input.startDate) {
    if (input.startTime) {
      if (!isQuarterTime(input.startTime)) {
        return {
          ok: false,
          error: "Times are on the :00 / :15 / :30 / :45.",
        };
      }
      startsAt = bangkokDateTimeToUtc(input.startDate, input.startTime);
      if (!startsAt) {
        return { ok: false, error: "That date and time don’t look right." };
      }
      hasTime = true;
      if (input.endTime) {
        if (!isQuarterTime(input.endTime)) {
          return {
            ok: false,
            error: "Times are on the :00 / :15 / :30 / :45.",
          };
        }
        const startMinutes =
          Number(input.startTime.slice(0, 2)) * 60 +
          Number(input.startTime.slice(3));
        const endMinutes =
          Number(input.endTime.slice(0, 2)) * 60 + Number(input.endTime.slice(3));
        const endDate =
          endMinutes <= startMinutes
            ? addCalendarDays(input.startDate, 1)
            : input.startDate;
        endsAt = bangkokDateTimeToUtc(endDate, input.endTime);
        if (!endsAt) {
          return { ok: false, error: "That end time doesn’t look right." };
        }
        if (endsAt.getTime() <= startsAt.getTime()) {
          return { ok: false, error: "End time must be after start." };
        }
      }
    } else if (input.endTime) {
      return { ok: false, error: "Add a start time before an end time." };
    } else {
      startsAt = bangkokDateTimeToUtc(input.startDate, "00:00");
      if (!startsAt) {
        return { ok: false, error: "That date doesn’t look right." };
      }
    }
  } else if (input.startTime || input.endTime) {
    return { ok: false, error: "Add a date first — or leave time empty for TBD." };
  }
  return { ok: true, startsAt, endsAt, hasTime, mapUrl: map.url };
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
      place: fields.venue || null,
      venue: fields.venue || null,
      mapUrl: checked.mapUrl,
      startsAt: checked.startsAt,
      endsAt: checked.endsAt,
      hasTime: checked.hasTime,
      sport: fields.sport,
      formation: fields.formation,
      positions: positionsForSport(fields.sport) as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/board");
  redirect(`/board/${matchday.id}?created=1`);
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
      place: fields.venue || null,
      venue: fields.venue || null,
      mapUrl: checked.mapUrl,
      startsAt: checked.startsAt,
      endsAt: checked.endsAt,
      hasTime: checked.hasTime,
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
