"use server";

import { revalidatePath } from "next/cache";
import {
  getOrCreateGuestId,
  rememberGuestName,
} from "@/lib/auth";
import { isKnownPosition, parsePositions } from "@/lib/positions";
import { prisma } from "@/lib/prisma";

export type RsvpState = {
  ok: boolean;
  error?: string;
} | null;

export async function submitRsvp(
  _prev: RsvpState,
  formData: FormData,
): Promise<NonNullable<RsvpState>> {
  const publicId = String(formData.get("publicId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "GOING");
  const positionKeyRaw = String(formData.get("position") ?? "").trim();

  if (!publicId) return { ok: false, error: "Missing matchday." };
  if (name.length < 1 || name.length > 40) {
    return { ok: false, error: "Type a name so the roster can list you." };
  }

  const status = statusRaw === "OUT" ? "OUT" : "GOING";
  const matchday = await prisma.matchday.findUnique({
    where: { publicId },
  });
  if (!matchday || matchday.deletedAt) {
    return { ok: false, error: "This matchday was deleted." };
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
    },
    create: {
      matchdayId: matchday.id,
      guestId,
      name,
      status,
      positionKey: status === "GOING" ? positionKey : null,
    },
  });

  revalidatePath(`/m/${publicId}`);
  revalidatePath(`/board/${matchday.id}`);
  return { ok: true };
}
