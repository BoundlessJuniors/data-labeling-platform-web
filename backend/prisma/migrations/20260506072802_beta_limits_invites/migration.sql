-- CreateEnum
CREATE TYPE "InviteRequestStatus" AS ENUM ('pending', 'code_sent', 'rejected');

-- CreateTable
CREATE TABLE "invite_codes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "created_by_user_id" UUID,
    "used_by_user_id" UUID,
    "used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_requests" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "status" "InviteRequestStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invite_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_code_key" ON "invite_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_used_by_user_id_key" ON "invite_codes"("used_by_user_id");

-- CreateIndex
CREATE INDEX "invite_codes_email_idx" ON "invite_codes"("email");

-- CreateIndex
CREATE INDEX "invite_codes_used_at_idx" ON "invite_codes"("used_at");

-- CreateIndex
CREATE INDEX "invite_codes_expires_at_idx" ON "invite_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "invite_requests_email_key" ON "invite_requests"("email");

-- CreateIndex
CREATE INDEX "invite_requests_status_idx" ON "invite_requests"("status");

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
