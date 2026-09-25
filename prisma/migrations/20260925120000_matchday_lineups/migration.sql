-- Additive: manager football lineup snapshots (XI + bench names at save).
CREATE TABLE "Lineup" (
    "id" TEXT NOT NULL,
    "matchdayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formation" TEXT NOT NULL,
    "slots" JSONB NOT NULL,
    "bench" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lineup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lineup_matchdayId_idx" ON "Lineup"("matchdayId");

ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_matchdayId_fkey" FOREIGN KEY ("matchdayId") REFERENCES "Matchday"("id") ON DELETE CASCADE ON UPDATE CASCADE;
