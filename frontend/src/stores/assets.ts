/**
 * Assets Store - State management for dataset assets
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { assetsApi } from '@/api/assets';
import type { Asset } from '@/types/asset';
import { getErrorMessage } from '@/types/api';
import { useToastStore } from './toast';
import { betaLimits } from '@/config/betaLimits';

export const useAssetsStore = defineStore('assets', () => {
  const toastStore = useToastStore();

  // State
  const assets = ref<Asset[]>([]);
  const currentAsset = ref<Asset | null>(null);
  const loading = ref(false);
  const uploading = ref(false);
  const uploadProgress = ref(0); // 0-100
  const error = ref<string | null>(null);
  const currentDatasetId = ref<string | null>(null);

  // Pagination
  const page = ref(1);
  const limit = ref(24);
  const total = ref(0);
  const totalPages = computed(() => Math.ceil(total.value / limit.value));

  /**
   * Fetch paginated assets for a dataset
   */
  async function fetchAssets(datasetId: string, newPage?: number) {
    loading.value = true;
    error.value = null;
    currentDatasetId.value = datasetId;

    try {
      const response = await assetsApi.list({
        datasetId,
        page: newPage ?? page.value,
        limit: limit.value,
      });

      assets.value = response.data.data;
      total.value = response.data.pagination?.total ?? response.data.data.length;
      page.value = newPage ?? page.value;

      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Assetler yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch single asset by ID
   */
  async function fetchAsset(assetId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await assetsApi.get(assetId);
      currentAsset.value = response.data.data;
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Asset yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Upload a single asset file to a dataset (Direct-to-R2)
   */
  async function uploadAsset(datasetId: string, file: File, updateState = true) {
    if (updateState) {
      uploading.value = true;
      uploadProgress.value = 0;
      error.value = null;
    }

    // 1. Client-side Validation: File Size Limit (Beta)
    const MAX_FILE_SIZE_BYTES = betaLimits.maxFileSizeBytes;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = `"${file.name}" ${betaLimits.maxFileSizeMbLabel}'dan büyük olamaz.`;
      toastStore.error(msg);
      
      // Hata durumunda loading state'i kapatmalıyız
      if (updateState) {
        error.value = msg;
        uploading.value = false;
      }
      return null;
    }

    try {
      // Step 1: Initiate (Dosya boyutunu da gönderiyoruz)
      // Not: api/assets.ts'deki initiateUpload fonksiyonu file.size parametresini kabul etmeli.
      const initRes = await assetsApi.initiateUpload(datasetId, file.name, file.type, file.size);
      const { signedUrl, assetId } = initRes.data.data;

      // Step 2: Upload to R2
      await assetsApi.uploadToR2(signedUrl, file, (progress) => {
        if (updateState) {
          uploadProgress.value = progress;
        }
      });

      // Step 3: Complete
      const completeRes = await assetsApi.completeUpload(assetId);
      
      return completeRes.data.data;

    } catch (_err) {
      const msg = getErrorMessage(_err, `"${file.name}" yüklenemedi`);
      toastStore.error(msg);
      
      if (updateState) {
        error.value = msg;
      }
      return null;
    } finally {
      if (updateState) {
        uploading.value = false;
      }
    }
  }

  /**
   * Upload multiple asset files to a dataset (Parallel)
   */
  async function uploadAssets(datasetId: string, files: File[], options?: { existingAssetCount?: number }) {
    if (files.length === 0) return;

    // Validate dataset max assets limit
    const existingCount = options?.existingAssetCount ?? total.value;
    if (existingCount + files.length > betaLimits.datasetMaxAssets) {
      const msg = `Beta sürümünde bir dataset'e en fazla ${betaLimits.datasetMaxAssets} görsel yükleyebilirsiniz. Şu an ${existingCount} görsel var ve ${files.length} tane daha eklemeye çalışıyorsunuz.`;
      toastStore.warning(msg);
      return;
    }

    uploading.value = true;
    uploadProgress.value = 0;
    error.value = null;

    let successCount = 0;
    let failCount = 0;
    let completedCount = 0;

    // Dosyaları paralel işlemek için map + Promise.all kullanıyoruz
    const uploadPromises = files.map(async (file) => {
      if (!file) return;
      
      // Tekil yüklemelerde state'i güncellemesini engelliyoruz (false)
      const result = await uploadAsset(datasetId, file, false);
      
      if (result) {
        successCount++;
      } else {
        failCount++;
      }

      completedCount++;
      // Toplu ilerleme durumu (Progress Bar)
      uploadProgress.value = Math.round((completedCount / files.length) * 100);
    });

    // Tüm yüklemelerin bitmesini bekle
    await Promise.all(uploadPromises);

    uploading.value = false;
    uploadProgress.value = 0;

    if (successCount > 0) {
      toastStore.success(`${successCount} asset başarıyla yüklendi.`);
      // Listeyi yenile
      await fetchAssets(datasetId, 1);
    }
    
    if (failCount > 0) {
      toastStore.warning(`${failCount} dosya yüklenemedi.`);
    }
  }

  /**
   * Delete an asset
   */
  async function deleteAsset(assetId: string) {
    loading.value = true;
    error.value = null;

    try {
      await assetsApi.delete(assetId);
      assets.value = assets.value.filter((a) => a.id !== assetId);
      total.value -= 1;
      toastStore.success('Asset silindi');
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Asset silinemedi');
      toastStore.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Go to specific page
   */
  async function goToPage(newPage: number) {
    if (currentDatasetId.value && newPage >= 1 && newPage <= totalPages.value) {
      return fetchAssets(currentDatasetId.value, newPage);
    }
    return false;
  }

  /**
   * Reset store state
   */
  function reset() {
    assets.value = [];
    currentAsset.value = null;
    loading.value = false;
    uploading.value = false;
    uploadProgress.value = 0;
    error.value = null;
    currentDatasetId.value = null;
    page.value = 1;
    total.value = 0;
  }

  return {
    // State
    assets,
    currentAsset,
    loading,
    uploading,
    uploadProgress,
    error,
    currentDatasetId,
    // Pagination
    page,
    limit,
    total,
    totalPages,
    // Actions
    fetchAssets,
    fetchAsset,
    uploadAsset,
    uploadAssets,
    deleteAsset,
    goToPage,
    reset,
  };
});