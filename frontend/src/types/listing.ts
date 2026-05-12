/**
 * Listing types (Marketplace)
 */

/** Listing status */
export type ListingStatus = 'open' | 'payment_pending' | 'in_progress' | 'completed' | 'cancelled';

/** Annotation format types */
export type AnnotationFormat = 'COCO' | 'YOLO' | 'VOC' | 'Custom';

/** Listing entity */
export interface Listing {
  id: string;
  title: string;
  description: string | null;
  datasetId: string;
  clientId: string;
  labelSetId: string;
  status: ListingStatus;
  priceTotal: number;
  currency: string;
  annotationFormat: AnnotationFormat;
  instructions: string | null;
  deadline?: string | null;
  maxLabelers?: number | null;
  totalAssets: number;
  completedAssets: number;
  dataset?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

/** Create listing request — matches backend Prisma Listing model */
export interface CreateListingRequest {
  title: string;
  description?: string;
  datasetId: string;
  labelSetId: string;
  labelSetVersion: number;
  labelingSpecJson: Record<string, unknown>;
  annotationFormat: AnnotationFormat;
  priceTotal: number;
  currency: string;
  qcMode?: string;
  deadlineAt?: string;
}

/** Update listing request — matches backend updateListing controller */
export interface UpdateListingRequest {
  title?: string;
  description?: string;
  priceTotal?: number;
  qcMode?: string;
  deadlineAt?: string;
  status?: string;
  annotationFormat?: AnnotationFormat;
  labelingSpecJson?: Record<string, unknown>;
}

/** Listing with relations */
export interface ListingWithDetails extends Listing {
  client: {
    id: string;
    displayName: string | null;
    email: string;
  };
  dataset: {
    id: string;
    name: string;
  };
  labelSet: {
    id: string;
    name: string;
  };
}
