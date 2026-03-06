/*
  Warnings:

  - The values [rejected] on the enum `ContractStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[task_id,payload_hash]` on the table `annotations_raw` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `annotations_normalized` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContractStatus_new" AS ENUM ('active', 'submitted', 'approved', 'revision_requested', 'cancelled');
ALTER TABLE "contracts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "contracts" ALTER COLUMN "status" TYPE "ContractStatus_new" USING ("status"::text::"ContractStatus_new");
ALTER TYPE "ContractStatus" RENAME TO "ContractStatus_old";
ALTER TYPE "ContractStatus_new" RENAME TO "ContractStatus";
DROP TYPE "ContractStatus_old";
ALTER TABLE "contracts" ALTER COLUMN "status" SET DEFAULT 'active';
COMMIT;

-- AlterTable
ALTER TABLE "annotations_normalized" ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "annotations_raw" ADD COLUMN     "lease_token" TEXT,
ADD COLUMN     "payload_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "annotations_raw_task_id_payload_hash_key" ON "annotations_raw"("task_id", "payload_hash");
