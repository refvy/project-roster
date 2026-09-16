"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrganiser } from "@/lib/auth";
import { publicId } from "@/lib/crypto";
import { parseFormation } from "@/lib/pitch";
import { parseSport, positionsForSport } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
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
  const sport = parseSport(formData.get("sport"));
  const formation =
    sport === "basketball" ? "4-3-3" : parseFormation(formData.get("formation"));
  return { title, whenWhere, sport, formation };
}

function validateFields(title: string, whenWhere: string): string | null {
  if (title.length < 2 || title.length > 80) {
    return "Give this matchday a short title.";
  }
  if (whenWhere.length < 2 || whenWhere.length > 200) {
    return "When and where as plain text — no booking needed.";
  }
  return null;
}

export async function createMatchday(
  _prev: MatchdayFormState,
  formData: FormData,
): Promise<NonNullable<MatchdayFormState>> {
  const organiser = await requireOrganiser();
  const { title, whenWhere, sport, formation } = readMatchdayFields(formData);
  const error = validateFields(title, whenWhere);
  if (error) return { error };

  const matchday = await prisma.matchday.create({
    data: {
      publicId: publicId(),
      organiserId: organiser.id,
      title,
      whenWhere,
      sport,
      formation,
      positions: positionsForSport(sport) as unknown as Prisma.InputJsonValue,
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
  const { title, whenWhere, sport, formation } = readMatchdayFields(formData);
  const error = validateFields(title, whenWhere);
  if (error) return { error };

  const matchday = await prisma.matchday.findFirst({
    where: { id, organiserId: organiser.id, deletedAt: null },
  });
  if (!matchday) redirect("/board");

  await prisma.matchday.update({
    where: { id: matchday.id },
    data: {
      title,
      whenWhere,
      sport,
      formation,
      positions: positionsForSport(sport) as unknown as Prisma.InputJsonValue,
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
