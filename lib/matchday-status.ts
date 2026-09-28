import type { MatchdayStatus } from "@prisma/client";

export function isMatchdayLive(matchday: {
  deletedAt: Date | null;
  status: MatchdayStatus;
}) {
  return !matchday.deletedAt && matchday.status === "LIVE";
}
