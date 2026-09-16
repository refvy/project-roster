-- AlterTable
ALTER TABLE "Rsvp" ADD COLUMN "addedByGuestId" TEXT;
ALTER TABLE "Rsvp" ADD COLUMN "addedByName" TEXT;

-- CreateIndex
CREATE INDEX "Rsvp_addedByGuestId_idx" ON "Rsvp"("addedByGuestId");
