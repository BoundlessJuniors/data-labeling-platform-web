/**
 * QC Preview types — tolerant definitions for annotation overlay rendering.
 */

// ---------------------------------------------------------------------------
// QC Sample (from GET /contracts/:id/qc-sample)
// ---------------------------------------------------------------------------

export interface QcSampleAsset {
  id: string;
  objectKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

export interface QcSampleTask {
  id: string;
  status: string;
  asset: QcSampleAsset;
  imageUrl: string | null;
}

export interface QcSampleResponse {
  contractId: string;
  totalTasks: number;
  sampleSize: number;
  tasks: QcSampleTask[];
}

// ---------------------------------------------------------------------------
// Task QC View (from GET /tasks/:id/qc-view)
// ---------------------------------------------------------------------------

export interface QcLabelSetLabel {
  id: string;
  name: string;
  color: string | null;
  attributesSchemaJson: unknown;
}

export interface QcLabelSet {
  id: string;
  name: string;
  version: number;
  labels: QcLabelSetLabel[];
}

export interface QcAnnotationRaw {
  id: string;
  taskId: string;
  labelerUserId: string;
  payloadJson: unknown;
  createdAt: string;
}

export interface QcAnnotationNormalized {
  id: string;
  taskId: string;
  normalizedJson: unknown;
  version: number;
}

export interface QcTaskViewAsset {
  id: string;
  objectKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

export interface QcTaskView {
  id: string;
  status: string;
  asset: QcTaskViewAsset;
  imageUrl: string | null;
  latestRaw: QcAnnotationRaw | null;
  normalized: QcAnnotationNormalized | null;
  normalizeReady: boolean;
  labelSet: QcLabelSet | null;
}

// ---------------------------------------------------------------------------
// Annotation overlay rendering shapes
// ---------------------------------------------------------------------------

/** A single annotation object from the payload */
export interface QcAnnotationShape {
  type?: string;
  label?: string;
  color?: string;

  // bbox / rectangle
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  bbox?: [number, number, number, number];

  // polygon / polyline / keypoints
  points?: Array<{ x: number; y: number }> | number[];

  // circle
  cx?: number;
  cy?: number;
  r?: number;

  // catch-all for unknown fields
  [key: string]: unknown;
}

/**
 * Resolves the effective shape type from an annotation shape.
 */
export function resolveShapeType(shape: QcAnnotationShape): string | null {
  let type = shape.type ? shape.type.toLowerCase() : null;
  
  if (type) {
    const aliasMap: Record<string, string | null> = {
      'rect': 'rectangle',
      'box': 'bbox',
      'bounding_box': 'bbox',
      'bounding-box': 'bbox',
      'poly': 'polygon',
      'line': 'polyline',
      'point': 'keypoint',
      'keypoints': 'keypoint',
      'export': null,
    };
    if (type in aliasMap) {
      type = aliasMap[type] ?? null;
    }
    if (type) return type;
  }

  if (shape.bbox) return 'bbox';
  if (shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) return 'rectangle';
  if (shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) return 'circle';
  if (shape.points) return 'polygon';
  return null;
}

/**
 * Checks if an object is a renderable annotation shape.
 */
export function isRenderableShape(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const shape = obj as QcAnnotationShape;

  if (shape.bbox) return true;
  if (shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) return true;
  if (shape.points) return true;
  if (shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) return true;

  const type = resolveShapeType(shape);
  if (type === 'keypoint' && shape.x !== undefined && shape.y !== undefined) return true;

  if (type && ['bbox', 'rectangle', 'polygon', 'polyline', 'circle', 'keypoint'].includes(type)) {
    if (type === 'bbox' || type === 'rectangle') {
      return (shape.bbox !== undefined) || (shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined);
    }
    if (type === 'polygon' || type === 'polyline') {
      return shape.points !== undefined;
    }
    if (type === 'circle') {
      return shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined;
    }
  }

  return false;
}

/**
 * Extracts annotation shapes from a raw/normalized JSON payload.
 * Tolerant: returns empty array on unparseable input.
 */
export function extractAnnotationShapes(payload: unknown): QcAnnotationShape[] {
  if (!payload || typeof payload !== 'object') return [];

  const extractFromArray = (arr: unknown[]): QcAnnotationShape[] => {
    return arr.filter((item): item is QcAnnotationShape => isRenderableShape(item));
  };

  // a) payload array ise -> array içindeki object’leri shape olarak döndür
  if (Array.isArray(payload)) {
    return extractFromArray(payload);
  }

  const obj = payload as Record<string, unknown>;

  // b) payload.data array ise -> payload.data içindeki object’leri shape olarak döndür
  if (Array.isArray(obj.data)) {
    return extractFromArray(obj.data);
  }

  // c) payload.annotations / shapes / objects / regions / items array ise
  const possibleKeys = ['annotations', 'shapes', 'objects', 'regions', 'items'];
  for (const key of possibleKeys) {
    if (Array.isArray(obj[key])) {
      return extractFromArray(obj[key]);
    }
  }

  // d) payload.data.shapes veya payload.data.annotations array ise
  if (obj.data && typeof obj.data === 'object') {
    const dataObj = obj.data as Record<string, unknown>;
    if (Array.isArray(dataObj.shapes)) return extractFromArray(dataObj.shapes);
    if (Array.isArray(dataObj.annotations)) return extractFromArray(dataObj.annotations);
  }

  // e) payload gerçekten tek shape ise ancak o zaman [payload] döndür
  if (isRenderableShape(obj)) {
    return [obj as QcAnnotationShape];
  }

  return [];
}

/**
 * Normalizes points from various formats to a consistent {x, y}[] array.
 */
export function normalizePoints(
  points: Array<{ x: number; y: number }> | number[] | undefined
): Array<{ x: number; y: number }> {
  if (!points || !Array.isArray(points)) return [];

  // Already {x, y}[] format
  if (points.length > 0 && typeof points[0] === 'object') {
    return points.filter((p: unknown) => typeof p === 'object' && p !== null && typeof (p as Record<string, unknown>).x === 'number' && typeof (p as Record<string, unknown>).y === 'number') as Array<{ x: number; y: number }>;
  }

  // Flat array [x1, y1, x2, y2, ...]
  const flat = points as number[];
  const result: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < flat.length - 1; i += 2) {
    const px = flat[i];
    const py = flat[i + 1];
    if (typeof px === 'number' && typeof py === 'number') {
      result.push({ x: px, y: py });
    }
  }
  return result;
}
