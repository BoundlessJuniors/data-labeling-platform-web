-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('client', 'labeler', 'admin');

-- CreateEnum
CREATE TYPE "DatasetStatus" AS ENUM ('draft', 'uploading', 'ready', 'archived');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "QcMode" AS ENUM ('none', 'client_approval', 'internal_reviewer');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('active', 'submitted', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ready', 'leased', 'submitted', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "EscrowType" AS ENUM ('hold', 'release_to_labeler', 'refund_to_client', 'platform_fee');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('accept', 'reject');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "display_name" TEXT,
    "rating_avg" DECIMAL(3,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasets" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DatasetStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "dataset_id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "size_bytes" BIGINT,
    "checksum" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "label_sets" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "label_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" UUID NOT NULL,
    "label_set_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "attributes_schema_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "dataset_id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "label_set_id" UUID NOT NULL,
    "label_set_version" INTEGER NOT NULL,
    "labeling_spec_json" JSONB NOT NULL,
    "qc_mode" "QcMode" NOT NULL DEFAULT 'none',
    "price_total" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "deadline_at" TIMESTAMPTZ,
    "status" "ListingStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "client_user_id" UUID NOT NULL,
    "labeler_user_id" UUID NOT NULL,
    "agreed_price_total" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "platform_fee_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ContractStatus" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'ready',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_leases" (
    "task_id" UUID NOT NULL,
    "labeler_user_id" UUID NOT NULL,
    "lease_token" TEXT NOT NULL,
    "leased_until" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_leases_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "annotations_raw" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "labeler_user_id" UUID NOT NULL,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annotations_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annotations_normalized" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "labeler_user_id" UUID NOT NULL,
    "normalized_json" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annotations_normalized_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "payer_user_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_ref" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_ledger" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "type" "EscrowType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escrow_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "meta_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "datasets_owner_user_id_idx" ON "datasets"("owner_user_id");

-- CreateIndex
CREATE INDEX "datasets_status_idx" ON "datasets"("status");

-- CreateIndex
CREATE INDEX "assets_dataset_id_idx" ON "assets"("dataset_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_dataset_id_object_key_key" ON "assets"("dataset_id", "object_key");

-- CreateIndex
CREATE INDEX "label_sets_owner_user_id_idx" ON "label_sets"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "label_sets_owner_user_id_name_version_key" ON "label_sets"("owner_user_id", "name", "version");

-- CreateIndex
CREATE INDEX "labels_label_set_id_idx" ON "labels"("label_set_id");

-- CreateIndex
CREATE UNIQUE INDEX "labels_label_set_id_name_key" ON "labels"("label_set_id", "name");

-- CreateIndex
CREATE INDEX "listings_dataset_id_idx" ON "listings"("dataset_id");

-- CreateIndex
CREATE INDEX "listings_owner_user_id_idx" ON "listings"("owner_user_id");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "listings_created_at_idx" ON "listings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_listing_id_key" ON "contracts"("listing_id");

-- CreateIndex
CREATE INDEX "contracts_client_user_id_idx" ON "contracts"("client_user_id");

-- CreateIndex
CREATE INDEX "contracts_labeler_user_id_idx" ON "contracts"("labeler_user_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "tasks_contract_id_status_idx" ON "tasks"("contract_id", "status");

-- CreateIndex
CREATE INDEX "tasks_asset_id_idx" ON "tasks"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_contract_id_asset_id_key" ON "tasks"("contract_id", "asset_id");

-- CreateIndex
CREATE INDEX "task_leases_labeler_user_id_idx" ON "task_leases"("labeler_user_id");

-- CreateIndex
CREATE INDEX "task_leases_leased_until_idx" ON "task_leases"("leased_until");

-- CreateIndex
CREATE INDEX "annotations_raw_task_id_idx" ON "annotations_raw"("task_id");

-- CreateIndex
CREATE INDEX "annotations_raw_labeler_user_id_idx" ON "annotations_raw"("labeler_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "annotations_normalized_task_id_key" ON "annotations_normalized"("task_id");

-- CreateIndex
CREATE INDEX "annotations_normalized_labeler_user_id_idx" ON "annotations_normalized"("labeler_user_id");

-- CreateIndex
CREATE INDEX "payments_contract_id_idx" ON "payments"("contract_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "escrow_ledger_contract_id_idx" ON "escrow_ledger"("contract_id");

-- CreateIndex
CREATE INDEX "escrow_ledger_type_idx" ON "escrow_ledger"("type");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "reviews_task_id_idx" ON "reviews"("task_id");

-- CreateIndex
CREATE INDEX "reviews_reviewer_user_id_idx" ON "reviews"("reviewer_user_id");

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_sets" ADD CONSTRAINT "label_sets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_label_set_id_fkey" FOREIGN KEY ("label_set_id") REFERENCES "label_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_label_set_id_fkey" FOREIGN KEY ("label_set_id") REFERENCES "label_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_labeler_user_id_fkey" FOREIGN KEY ("labeler_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_leases" ADD CONSTRAINT "task_leases_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_leases" ADD CONSTRAINT "task_leases_labeler_user_id_fkey" FOREIGN KEY ("labeler_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations_raw" ADD CONSTRAINT "annotations_raw_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations_raw" ADD CONSTRAINT "annotations_raw_labeler_user_id_fkey" FOREIGN KEY ("labeler_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations_normalized" ADD CONSTRAINT "annotations_normalized_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations_normalized" ADD CONSTRAINT "annotations_normalized_labeler_user_id_fkey" FOREIGN KEY ("labeler_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_user_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
