-- CreateEnum
CREATE TYPE "StorageState" AS ENUM ('active', 'purge_scheduled', 'purging', 'purged', 'purge_failed');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_user_id_fkey";

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "object_delete_error" TEXT,
ADD COLUMN     "object_deleted_at" TIMESTAMPTZ,
ADD COLUMN     "storage_state" "StorageState" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "actor_user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "storage_purge_eligible_at" TIMESTAMPTZ,
ADD COLUMN     "storage_purge_error" TEXT,
ADD COLUMN     "storage_purge_reason" TEXT,
ADD COLUMN     "storage_purge_scheduled_at" TIMESTAMPTZ,
ADD COLUMN     "storage_purged_at" TIMESTAMPTZ,
ADD COLUMN     "storage_state" "StorageState" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "assets_storage_state_idx" ON "assets"("storage_state");

-- CreateIndex
CREATE INDEX "datasets_storage_state_idx" ON "datasets"("storage_state");

-- CreateIndex
CREATE INDEX "datasets_storage_purge_eligible_at_idx" ON "datasets"("storage_purge_eligible_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
