/**
 * Dataset types
 */

/** Dataset status */
export type DatasetStatus = 'draft' | 'active' | 'archived';

/** Dataset entity */
export interface Dataset {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  status: DatasetStatus;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Create dataset request */
export interface CreateDatasetRequest {
  name: string;
  description?: string;
}

/** Update dataset request */
export interface UpdateDatasetRequest {
  name?: string;
  description?: string;
  status?: DatasetStatus;
}

/** Dataset with owner info */
export interface DatasetWithOwner extends Dataset {
  owner: {
    id: string;
    displayName: string | null;
    email: string;
  };
}
