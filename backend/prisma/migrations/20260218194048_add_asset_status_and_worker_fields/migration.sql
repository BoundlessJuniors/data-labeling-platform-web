-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('pending', 'uploaded', 'processing', 'ready', 'error');

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "processing_error" TEXT,
ADD COLUMN     "status" "AssetStatus" NOT NULL DEFAULT 'pending';
