/*
  Warnings:

  - A unique constraint covering the columns `[proposal_id]` on the table `contracts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `delivery_days` to the `contracts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `contracts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delivery_days` to the `proposals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "approved_at" TIMESTAMPTZ,
ADD COLUMN     "auto_cancel_at" TIMESTAMPTZ,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ,
ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "delivery_days" INTEGER NOT NULL,
ADD COLUMN     "dispute_reason" TEXT,
ADD COLUMN     "disputed_at" TIMESTAMPTZ,
ADD COLUMN     "due_at" TIMESTAMPTZ,
ADD COLUMN     "grace_period_hours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "max_revision_count" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "overdue_at" TIMESTAMPTZ,
ADD COLUMN     "paid_at" TIMESTAMPTZ,
ADD COLUMN     "proposal_id" UUID,
ADD COLUMN     "refunded_at" TIMESTAMPTZ,
ADD COLUMN     "review_due_at" TIMESTAMPTZ,
ADD COLUMN     "review_window_hours" INTEGER NOT NULL DEFAULT 72,
ADD COLUMN     "revision_due_at" TIMESTAMPTZ,
ADD COLUMN     "revision_window_hours" INTEGER NOT NULL DEFAULT 72,
ADD COLUMN     "submitted_at" TIMESTAMPTZ,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending_payment',
ALTER COLUMN "started_at" DROP NOT NULL,
ALTER COLUMN "started_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "escrow_ledger" ADD COLUMN     "meta_json" JSONB,
ADD COLUMN     "payment_id" UUID;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "checkout_url" TEXT,
ADD COLUMN     "failed_at" TIMESTAMPTZ,
ADD COLUMN     "labeler_earning_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "labeler_user_id" UUID,
ADD COLUMN     "paid_at" TIMESTAMPTZ,
ADD COLUMN     "payment_expires_at" TIMESTAMPTZ,
ADD COLUMN     "platform_fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "provider_conversation_id" TEXT,
ADD COLUMN     "provider_payment_id" TEXT,
ADD COLUMN     "provider_transaction_id" TEXT,
ADD COLUMN     "refunded_at" TIMESTAMPTZ,
ADD COLUMN     "released_at" TIMESTAMPTZ,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "delivery_days" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "contracts_proposal_id_key" ON "contracts"("proposal_id");

-- CreateIndex
CREATE INDEX "contracts_proposal_id_idx" ON "contracts"("proposal_id");

-- CreateIndex
CREATE INDEX "contracts_due_at_idx" ON "contracts"("due_at");

-- CreateIndex
CREATE INDEX "contracts_auto_cancel_at_idx" ON "contracts"("auto_cancel_at");

-- CreateIndex
CREATE INDEX "contracts_review_due_at_idx" ON "contracts"("review_due_at");

-- CreateIndex
CREATE INDEX "contracts_revision_due_at_idx" ON "contracts"("revision_due_at");

-- CreateIndex
CREATE INDEX "escrow_ledger_payment_id_idx" ON "escrow_ledger"("payment_id");

-- CreateIndex
CREATE INDEX "payments_payer_user_id_idx" ON "payments"("payer_user_id");

-- CreateIndex
CREATE INDEX "payments_labeler_user_id_idx" ON "payments"("labeler_user_id");

-- CreateIndex
CREATE INDEX "payments_payment_expires_at_idx" ON "payments"("payment_expires_at");

-- CreateIndex
CREATE INDEX "payments_provider_idx" ON "payments"("provider");

-- CreateIndex
CREATE INDEX "payments_provider_payment_id_idx" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE INDEX "payments_provider_transaction_id_idx" ON "payments"("provider_transaction_id");

-- CreateIndex
CREATE INDEX "proposals_created_at_idx" ON "proposals"("created_at");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_labeler_user_id_fkey" FOREIGN KEY ("labeler_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
