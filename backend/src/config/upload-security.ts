/**
 * Upload Security Configuration
 *
 * Single source of truth for all upload-related security constraints.
 * Import from here in:
 *   - asset.controller.ts
 *   - asset.service.ts
 *   - upload.middleware.ts
 *   - asset.worker.ts
 *   - validation.schemas.ts (allowed MIME list)
 *
 * Do NOT add SVG, GIF, AVIF, or any other format here without a full
 * security review of the downstream processing pipeline.
 */

import { BadRequestError } from '../utils/errors';

// ---------------------------------------------------------------------------
// Allowed MIME types for image uploads
// ---------------------------------------------------------------------------

export const ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

// ---------------------------------------------------------------------------
// Mapping: MIME type → safe file extension (always MIME-derived, never from filename)
// ---------------------------------------------------------------------------

export const MIME_TO_EXT: Readonly<Record<string, string>> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
} as const;

// ---------------------------------------------------------------------------
// Allowed Sharp format strings (returned by sharp(buffer).metadata().format)
// Any format not in this list must be rejected by the worker.
// ---------------------------------------------------------------------------

export const ALLOWED_SHARP_FORMATS: readonly string[] = [
  'jpeg',
  'png',
  'webp',
] as const;

// ---------------------------------------------------------------------------
// Mapping: MIME type → expected Sharp format string
// Used by the worker to cross-check detected format against declared MIME type.
// Prevents a PNG file uploaded with Content-Type: image/jpeg from being accepted.
// ---------------------------------------------------------------------------

export const MIME_TO_SHARP_FORMAT: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

// ---------------------------------------------------------------------------
// Helper: normalize a content-type string (lowercase + trim)
// ---------------------------------------------------------------------------

export function normalizeContentType(contentType: string): string {
  return contentType.toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// Helper: check whether a MIME type is in the allowlist
// ---------------------------------------------------------------------------

export function isAllowedImageMimeType(contentType: string): boolean {
  return (ALLOWED_MIME_TYPES as string[]).includes(normalizeContentType(contentType));
}

// ---------------------------------------------------------------------------
// Helper: get the safe extension for an allowed MIME type
// Throws BadRequestError if the MIME type is not in the allowlist.
// ---------------------------------------------------------------------------

export function getExtensionForMimeType(contentType: string): string {
  const normalized = normalizeContentType(contentType);
  const ext = MIME_TO_EXT[normalized];
  if (!ext) {
    throw new BadRequestError(
      `Desteklenmeyen içerik türü: "${contentType}". İzin verilen türler: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }
  return ext;
}

// ---------------------------------------------------------------------------
// Helper: combined validation for initiate-upload inputs
// Throws BadRequestError on first violation.
// ---------------------------------------------------------------------------

export function validateImageUploadInput(
  contentType: string,
  fileSize: number,
  maxFileSizeBytes: number
): void {
  if (!contentType || !isAllowedImageMimeType(contentType)) {
    throw new BadRequestError(
      `Desteklenmeyen dosya formatı. İzin verilen formatlar: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }
  if (!fileSize || fileSize <= 0) {
    throw new BadRequestError('Dosya boyutu sıfırdan büyük olmalıdır.');
  }
  if (fileSize > maxFileSizeBytes) {
    const maxMb = (maxFileSizeBytes / (1024 * 1024)).toFixed(1);
    throw new BadRequestError(`Dosya boyutu ${maxMb} MB'ı geçemez.`);
  }
}
