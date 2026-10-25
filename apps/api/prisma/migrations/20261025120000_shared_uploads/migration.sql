-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "uploadToken" TEXT;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "uploadedById" TEXT,
ADD COLUMN     "uploaderName" TEXT;

-- CreateTable
CREATE TABLE "EventMember" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMember_email_idx" ON "EventMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_eventId_email_key" ON "EventMember"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Event_uploadToken_key" ON "Event"("uploadToken");

-- CreateIndex
CREATE INDEX "Photo_eventId_approved_idx" ON "Photo"("eventId", "approved");

-- AddForeignKey
ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

