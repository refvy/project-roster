"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrganiser } from "@/lib/auth";
import { publicId } from "@/lib/crypto";
import { parseSport, positionsForSport } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type CreateMatchdayState = {
  error?: string;
} | null;

export async function createMatchday(
  _prev: CreateMatchdayState,
  formData: FormData,
): Promise<NonNullable<CreateMatchdayState>> {
  const organiser = await getOrganiser();
  if (!organiser) {
    redirect("/");
  }

  const title = String(formData.get("title") ?? "").trim();
  const whenWhere = String(formData.get("whenWhere") ?? "").trim();
  const sport = parseSport(formData.get("sport"));
  if (title.length < 2 || title.length > 80) {
    return { error: "Give this matchday a short title." };
  }
  if (whenWhere.length < 2 || whenWhere.length > 200) {
    return { error: "When and where as plain text — no booking needed." };
  }

  const matchday = await prisma.matchday.create({
    data: {
      publicId: publicId(),
      organiserId: organiser.id,
      title,
      whenWhere,
      sport,
      positions: positionsForSport(sport) as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/board");
  redirect(`/board/${matchday.id}`);
}
