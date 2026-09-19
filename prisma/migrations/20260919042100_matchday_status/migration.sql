-- Additive: existing rows default to LIVE. Does not touch RSVPs or deletedAt.
CREATE TYPE "MatchdayStatus" AS ENUM ('LIVE', 'CANCELLED', 'COMPLETED');

ALTER TABLE "Matchday" ADD COLUMN "status" "MatchdayStatus" NOT NULL DEFAULT 'LIVE';
