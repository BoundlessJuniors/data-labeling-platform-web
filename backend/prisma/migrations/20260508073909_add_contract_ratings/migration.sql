-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rating_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "contract_ratings" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "client_user_id" UUID NOT NULL,
    "labeler_user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contract_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_ratings_contract_id_key" ON "contract_ratings"("contract_id");

-- CreateIndex
CREATE INDEX "contract_ratings_client_user_id_idx" ON "contract_ratings"("client_user_id");

-- CreateIndex
CREATE INDEX "contract_ratings_labeler_user_id_idx" ON "contract_ratings"("labeler_user_id");

-- CreateIndex
CREATE INDEX "contract_ratings_rating_idx" ON "contract_ratings"("rating");

-- CreateIndex
CREATE INDEX "contract_ratings_created_at_idx" ON "contract_ratings"("created_at");

-- AddForeignKey
ALTER TABLE "contract_ratings" ADD CONSTRAINT "contract_ratings_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_ratings" ADD CONSTRAINT "contract_ratings_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_ratings" ADD CONSTRAINT "contract_ratings_labeler_user_id_fkey" FOREIGN KEY ("labeler_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
