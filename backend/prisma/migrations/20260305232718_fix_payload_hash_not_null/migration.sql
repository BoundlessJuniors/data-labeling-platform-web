/*
  Warnings:

  - Made the column `payload_hash` on table `annotations_raw` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "annotations_raw" ALTER COLUMN "payload_hash" SET NOT NULL;
