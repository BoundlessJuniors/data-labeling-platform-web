export type ExportFormat = 'COCO' | 'YOLO' | 'VOC';

export interface NormalizedBBox {
  id: number | string;
  type: 'bbox';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportableTaskRecord {
  taskId: string;
  objectKey: string;
  basename: string;
  width: number;
  height: number;
  bboxes: NormalizedBBox[];
}

export interface ExportArtifact {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}
