-- CreateEnum
CREATE TYPE "AnnotationFormat" AS ENUM ('COCO', 'YOLO', 'VOC', 'Custom');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "annotation_format" "AnnotationFormat" NOT NULL DEFAULT 'COCO';
