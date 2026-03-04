-- AlterEnum
ALTER TYPE "ContractStatus" ADD VALUE 'revision_requested';

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "revision_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revision_reason" TEXT,
ADD COLUMN     "revision_requested_at" TIMESTAMPTZ;
