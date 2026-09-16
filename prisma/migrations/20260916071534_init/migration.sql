-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('GOING', 'OUT');

-- CreateTable
CREATE TABLE "Organiser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL,
    "organiserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "organiserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matchday" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "organiserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "whenWhere" TEXT NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'football',
    "positions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Matchday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rsvp" (
    "id" TEXT NOT NULL,
    "matchdayId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL,
    "positionKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organiser_email_key" ON "Organiser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_tokenHash_key" ON "MagicLink"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLink_organiserId_idx" ON "MagicLink"("organiserId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_organiserId_idx" ON "Session"("organiserId");

-- CreateIndex
CREATE UNIQUE INDEX "Matchday_publicId_key" ON "Matchday"("publicId");

-- CreateIndex
CREATE INDEX "Matchday_organiserId_idx" ON "Matchday"("organiserId");

-- CreateIndex
CREATE INDEX "Rsvp_matchdayId_status_idx" ON "Rsvp"("matchdayId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_matchdayId_guestId_key" ON "Rsvp"("matchdayId", "guestId");

-- AddForeignKey
ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "Organiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "Organiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchday" ADD CONSTRAINT "Matchday_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "Organiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_matchdayId_fkey" FOREIGN KEY ("matchdayId") REFERENCES "Matchday"("id") ON DELETE CASCADE ON UPDATE CASCADE;
