-- Additive: LINE cache-bust token for Share update / daily OG refresh.
-- Existing rows default to "0". Does not touch RSVPs, status, or deletedAt.
ALTER TABLE "Matchday" ADD COLUMN "ogBust" TEXT NOT NULL DEFAULT '0';
