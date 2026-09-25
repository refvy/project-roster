-- Additive: venue + map URL, and hasTime so a date can exist without a kickoff time.
-- Existing place text is copied into venue. place stays in sync for live dogfood.
ALTER TABLE "Matchday" ADD COLUMN "hasTime" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Matchday" ADD COLUMN "venue" TEXT;
ALTER TABLE "Matchday" ADD COLUMN "mapUrl" TEXT;

UPDATE "Matchday" SET "hasTime" = true WHERE "startsAt" IS NOT NULL;
UPDATE "Matchday" SET "venue" = "place" WHERE "place" IS NOT NULL AND "venue" IS NULL;
