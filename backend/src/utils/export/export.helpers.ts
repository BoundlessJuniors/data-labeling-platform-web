import { BadRequestError } from '../errors';
import { ExportShape } from './export.types';
export function extractExportShapes(
  payloadData: any[],
  labelSetLabels: { name: string }[],
  imageWidth: number,
  imageHeight: number
): ExportShape[] {
  if (!Array.isArray(payloadData)) {
    return [];
  }

  if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
    throw new BadRequestError('Task image dimensions are required for export.');
  }

  const validLabels = new Set(labelSetLabels.map(l => l.name));
  const shapes: ExportShape[] = [];

  for (const item of payloadData) {
    if (!item.type) {
      throw new BadRequestError(`Unsupported annotation type: undefined`);
    }

    if (!validLabels.has(item.label)) {
      throw new BadRequestError(`Label '${item.label}' found in annotation but it does not exist in the contract's label set.`);
    }

    let derivedBbox: { x: number; y: number; width: number; height: number };

    switch (item.type) {
      case 'bbox':
        if (!Number.isFinite(item.x) || !Number.isFinite(item.y) ||
            !Number.isFinite(item.width) || !Number.isFinite(item.height) ||
            item.width <= 0 || item.height <= 0) {
          throw new BadRequestError(`Invalid bbox geometry for annotation ${item.id}`);
        }
        derivedBbox = clampBboxToImage({ x: item.x, y: item.y, width: item.width, height: item.height }, imageWidth, imageHeight, item.id);
        shapes.push({ ...item, derivedBbox } as ExportShape);
        break;

      case 'polygon':
        if (!Array.isArray(item.points) || item.points.length < 3) {
          throw new BadRequestError(`Invalid polygon geometry for annotation ${item.id}`);
        }
        derivedBbox = clampBboxToImage(calculateBoundingBoxFromPoints(item.points, item.id, item.type), imageWidth, imageHeight, item.id);
        shapes.push({ ...item, derivedBbox } as ExportShape);
        break;

      case 'polyline':
        if (!Array.isArray(item.points) || item.points.length < 2) {
          throw new BadRequestError(`Invalid polyline geometry for annotation ${item.id}`);
        }
        derivedBbox = clampBboxToImage(calculateBoundingBoxFromPoints(item.points, item.id, item.type), imageWidth, imageHeight, item.id);
        shapes.push({ ...item, derivedBbox } as ExportShape);
        break;

      case 'keypoint':
        if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) {
          throw new BadRequestError(`Invalid keypoint geometry for annotation ${item.id}`);
        }
        if (item.x < 0 || item.y < 0 || item.x > imageWidth || item.y > imageHeight) {
          throw new BadRequestError(`Keypoint annotation ${item.id} is outside image bounds.`);
        }
        // Small derived bbox around the point
        derivedBbox = clampBboxToImage({ x: item.x - 2, y: item.y - 2, width: 4, height: 4 }, imageWidth, imageHeight, item.id);
        shapes.push({ ...item, derivedBbox } as ExportShape);
        break;

      case 'circle':
        if (!Number.isFinite(item.cx) || !Number.isFinite(item.cy) || !Number.isFinite(item.r) || item.r <= 0) {
          throw new BadRequestError(`Invalid circle geometry for annotation ${item.id}`);
        }
        derivedBbox = clampBboxToImage({ x: item.cx - item.r, y: item.cy - item.r, width: 2 * item.r, height: 2 * item.r }, imageWidth, imageHeight, item.id);
        shapes.push({ ...item, derivedBbox } as ExportShape);
        break;

      default:
        throw new BadRequestError(`Unsupported annotation type: ${item.type}`);
    }
  }

  return shapes;
}

function clampBboxToImage(
  bbox: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
  annotationId: string | number
) {
  if (!Number.isFinite(bbox.x) || !Number.isFinite(bbox.y) || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) {
    throw new BadRequestError(`Invalid geometry for annotation ${annotationId}`);
  }
  if (bbox.width <= 0 || bbox.height <= 0) {
    throw new BadRequestError(`Invalid geometry for annotation ${annotationId}`);
  }

  const xmin = Math.max(bbox.x, 0);
  const ymin = Math.max(bbox.y, 0);
  const xmax = Math.min(bbox.x + bbox.width, imageWidth);
  const ymax = Math.min(bbox.y + bbox.height, imageHeight);

  const clampedWidth = xmax - xmin;
  const clampedHeight = ymax - ymin;

  if (clampedWidth <= 0 || clampedHeight <= 0) {
    throw new BadRequestError(`Annotation ${annotationId} is outside image bounds.`);
  }

  return { x: xmin, y: ymin, width: clampedWidth, height: clampedHeight };
}

function calculateBoundingBoxFromPoints(points: { x: number; y: number }[], annotationId: string | number, annotationType: string) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      throw new BadRequestError(`Invalid ${annotationType} geometry for annotation ${annotationId}`);
    }
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  // Ensure width and height are strictly positive
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  return { x: minX, y: minY, width, height };
}

export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export function sanitizeExportFilenamePart(value: string, fallback: string): string {
  if (!value) return fallback;
  // Remove control characters, CR/LF
  let sanitized = value.replace(/[\x00-\x1F\x7F-\x9F\r\n]/g, '');
  // Remove path separators
  sanitized = sanitized.replace(/[/\\]/g, '_');
  // Remove remaining unsafe characters keeping: letters, numbers, dash, underscore, dot, space
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_ ]/g, '');
  // Trim whitespace
  sanitized = sanitized.trim();
  // Prevent "." and ".."
  if (sanitized === '.' || sanitized === '..') {
    return fallback;
  }
  // Truncate if too long
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200).trim();
  }
  return sanitized.length > 0 ? sanitized : fallback;
}

export function sanitizeArchiveEntryName(value: string, fallback: string): string {
  // Re-use filename sanitization to ensure no directory traversal escapes
  return sanitizeExportFilenamePart(value, fallback);
}

export function sanitizeYoloLabel(value: string): string {
  if (!value) return 'unknown';
  return value.replace(/[\x00-\x1F\x7F-\x9F\r\n]/g, '').trim() || 'unknown';
}

export function quoteYamlString(value: string): string {
  return JSON.stringify(value);
}
