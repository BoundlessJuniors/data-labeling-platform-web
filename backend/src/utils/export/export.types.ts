export type ExportFormat = 'COCO' | 'YOLO' | 'VOC';

export interface BaseExportShape {
  id: number | string;
  label: string;
  type: string;
  derivedBbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ExportBBox extends BaseExportShape {
  type: 'bbox';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportPolygon extends BaseExportShape {
  type: 'polygon';
  points: { x: number; y: number }[];
}

export interface ExportPolyline extends BaseExportShape {
  type: 'polyline';
  points: { x: number; y: number }[];
}

export interface ExportKeypoint extends BaseExportShape {
  type: 'keypoint';
  x: number;
  y: number;
}

export interface ExportCircle extends BaseExportShape {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export type ExportShape =
  | ExportBBox
  | ExportPolygon
  | ExportPolyline
  | ExportKeypoint
  | ExportCircle;

export interface ExportableTaskRecord {
  taskId: string;
  objectKey: string;
  basename: string;
  width: number;
  height: number;
  shapes: ExportShape[];
}

export interface ExportArtifact {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}
