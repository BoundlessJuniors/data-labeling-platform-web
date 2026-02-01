/**
 * Assets Store - State management for dataset assets
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { assetsApi } from '@/api/assets';
import type { Asset } from '@/types/asset';
import { getErrorMessage } from '@/types/api';
import { useToastStore } from './toast';

export const useAssetsStore = defineStore('assets', () => {
  const toastStore = useToastStore();

  // State
  const assets = ref<Asset[]>([]);
  const currentAsset = ref<Asset | null>(null);
  const loading = ref(false);
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
  async function fetchAsset(datasetId: string, assetId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await assetsApi.get(datasetId, assetId);
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
   * Delete an asset
   */
  async function deleteAsset(datasetId: string, assetId: string) {
    loading.value = true;
    error.value = null;

    try {
      await assetsApi.delete(datasetId, assetId);
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
    deleteAsset,
    goToPage,
    reset,
  };
});
