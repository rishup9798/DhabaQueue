-- Add COMPLETED queue status
CREATE TYPE "QueueStatus_new" AS ENUM (
    'WAITING',
    'NOTIFIED',
    'SEATED',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
);

ALTER TABLE "QueueEntry"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "QueueEntry"
ALTER COLUMN "status" TYPE "QueueStatus_new"
USING ("status"::text::"QueueStatus_new");

ALTER TABLE "QueueEntry"
ALTER COLUMN "status" SET DEFAULT 'WAITING';

DROP TYPE "QueueStatus";

ALTER TYPE "QueueStatus_new" RENAME TO "QueueStatus";

-- Add served timestamp to food orders
ALTER TABLE "FoodOrder"
ADD COLUMN "servedAt" TIMESTAMP(3);

-- Add table assignment to queue entries
ALTER TABLE "QueueEntry"
ADD COLUMN "tableId" TEXT;

CREATE INDEX "QueueEntry_tableId_idx"
ON "QueueEntry"("tableId");

ALTER TABLE "QueueEntry"
ADD CONSTRAINT "QueueEntry_tableId_fkey"
FOREIGN KEY ("tableId")
REFERENCES "Table"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;