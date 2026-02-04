-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- DropIndex
DROP INDEX "contracts_listing_id_key";

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "annotation_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_leased_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "proposals" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "labeler_user_id" UUID NOT NULL,
    "price_quote" DECIMAL(12,2) NOT NULL,
    "coverLetter" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "labeler_user_id" UUID NOT NULL,
    "format" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposals_listing_id_idx" ON "proposals"("listing_id");

-- CreateIndex
CREATE INDEX "proposals_labeler_user_id_idx" ON "proposals"("labeler_user_id");

-- CreateIndex
CREATE INDEX "proposals_status_idx" ON "proposals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_listing_id_labeler_user_id_key" ON "proposals"("listing_id", "labeler_user_id");

-- CreateIndex
CREATE INDEX "submissions_contract_id_idx" ON "submissions"("contract_id");

-- CreateIndex
CREATE INDEX "submissions_labeler_user_id_idx" ON "submissions"("labeler_user_id");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "contracts_listing_id_idx" ON "contracts"("listing_id");

-- CreateIndex
CREATE INDEX "tasks_last_leased_at_idx" ON "tasks"("last_leased_at");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_labeler_user_id_fkey" FOREIGN KEY ("labeler_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_labeler_user_id_fkey" FOREIGN KEY ("labeler_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
