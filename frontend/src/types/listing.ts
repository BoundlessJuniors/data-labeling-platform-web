/**
 * Listing types (Marketplace)
 */

/** Listing status */
export type ListingStatus = 'draft' | 'published' | 'closed' | 'completed';

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
  pricePerAsset: number;
  currency: string;
  annotationFormat: AnnotationFormat;
  instructions: string | null;
  deadline?: string | null;
  maxLabelers?: number | null;
  totalAssets: number;
  completedAssets: number;
  createdAt: string;
  updatedAt: string;
}

/** Create listing request */
export interface CreateListingRequest {
  title: string;
  description?: string;
  datasetId: string;
  labelSetId: string;
  pricePerAsset: number;
  currency?: string;
  annotationFormat: AnnotationFormat;
  instructions?: string;
  deadline?: string;
  maxLabelers?: number;
}

/** Update listing request */
export interface UpdateListingRequest {
  title?: string;
  description?: string;
  pricePerAsset?: number;
  instructions?: string;
  deadline?: string;
  maxLabelers?: number;
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
