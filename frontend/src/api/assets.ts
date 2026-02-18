/**
 * Assets API Module
 */
import apiClient from './client';
import type { Asset } from '@/types/asset';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export interface AssetListParams {
  page?: number;
  limit?: number;
  datasetId: string;
}

export const assetsApi = {
  /**
   * Get paginated list of assets for a dataset
   */
  list(params: AssetListParams) {
    return apiClient.get<PaginatedResponse<Asset>>(`/assets`, {
      params: { page: params.page, limit: params.limit, datasetId: params.datasetId },
    });
  },

  /**
   * Get single asset by ID
   */
  get(assetId: string) {
    return apiClient.get<ApiResponse<Asset>>(`/assets/${assetId}`);
  },

  /**
   * Step 1: Initiate upload (get presigned URL)
   */
  initiateUpload(datasetId: string, filename: string, contentType: string, fileSize: number) {
    return apiClient.post<ApiResponse<{ signedUrl: string; assetId: string; objectKey: string }>>(
      '/assets/initiate',
      { datasetId, filename, contentType, fileSize }
    );
  },

  /**
   * Step 2: Upload to R2 (Direct PUT)
   * Uses a fresh axios instance or fetch to avoid global interceptors/headers
   */
  async uploadToR2(signedUrl: string, file: File, onProgress?: (progress: number) => void) {
    // We use a direct XMLHttp or fetch approach, or a clean axios call.
    // To ensure no 'Authorization' header is sent, we can use XHR or fetch.
    // However, for progress, XHR or Axios is needed.
    
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      
      xhr.send(file);
    });
  },

  /**
   * Step 3: Complete/Confirm upload
   */
  completeUpload(assetId: string) {
    return apiClient.post<ApiResponse<Asset>>(`/assets/${assetId}/confirm`);
  },

  /**
   * Delete an asset
   */
  delete(assetId: string) {
    return apiClient.delete<ApiResponse<void>>(`/assets/${assetId}`);
  },
};
