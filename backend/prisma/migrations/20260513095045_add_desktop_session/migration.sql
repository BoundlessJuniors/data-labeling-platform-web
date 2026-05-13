-- CreateTable
CREATE TABLE "desktop_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "refresh_token_version" INTEGER NOT NULL DEFAULT 1,
    "device_name" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ,
    "access_token_expires_at" TIMESTAMPTZ,
    "refresh_token_expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "revoked_reason" TEXT,
    "replaced_by_session_id" UUID,

    CONSTRAINT "desktop_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "desktop_sessions_user_id_idx" ON "desktop_sessions"("user_id");

-- CreateIndex
CREATE INDEX "desktop_sessions_refresh_token_hash_idx" ON "desktop_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "desktop_sessions_revoked_at_idx" ON "desktop_sessions"("revoked_at");

-- CreateIndex
CREATE INDEX "desktop_sessions_refresh_token_expires_at_idx" ON "desktop_sessions"("refresh_token_expires_at");

-- AddForeignKey
ALTER TABLE "desktop_sessions" ADD CONSTRAINT "desktop_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
