-- AlterTable
ALTER TABLE "Matchday" ADD COLUMN "formation" TEXT NOT NULL DEFAULT '4-3-3';
ALTER TABLE "Matchday" ADD COLUMN "deletedAt" TIMESTAMP(3);
