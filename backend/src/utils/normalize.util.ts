import { Prisma } from '@prisma/client';

/**
 * Normalize a raw annotation payload into the normalized format.
 *
 * MVP: identity transform — raw payload is returned as-is.
 * This function exists as a separate unit so it can be extended later
 * (e.g. schema validation, coordinate transformations, COCO/YOLO export prep).
 *
 * @param rawPayload  The raw annotation JSON stored in AnnotationRaw.payloadJson
 * @returns           The normalized JSON to be stored in AnnotationNormalized.normalizedJson
 */
export function normalizeRawPayload(rawPayload: Prisma.JsonValue): Prisma.JsonValue {
  // MVP: pass-through.  Add transformations here as needed.
  return rawPayload;
}
