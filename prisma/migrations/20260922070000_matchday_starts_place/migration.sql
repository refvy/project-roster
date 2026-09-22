-- Additive: optional structured start/end (UTC) and place.
-- whenWhere stays as messy fallback text. Existing rows unchanged.
ALTER TABLE "Matchday" ADD COLUMN "startsAt" TIMESTAMP(3);
ALTER TABLE "Matchday" ADD COLUMN "endsAt" TIMESTAMP(3);
ALTER TABLE "Matchday" ADD COLUMN "place" TEXT;
ALTER TABLE "Matchday" ALTER COLUMN "whenWhere" SET DEFAULT '';
