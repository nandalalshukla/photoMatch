-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Photo_eventId_contentHash_key" ON "Photo"("eventId", "contentHash");

