/**
 * Asset types
 */

/** Asset status */
export type AssetStatus = 'pending' | 'ready' | 'processing' | 'error';

/** Asset entity */
export interface Asset {
  id: string;
  datasetId: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  status: AssetStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/** Asset upload metadata */
export interface AssetUploadMeta {
  fileName: string;
  mimeType: string;
  fileSize: number;
}
