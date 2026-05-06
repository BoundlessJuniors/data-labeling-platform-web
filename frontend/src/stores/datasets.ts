/**
 * Datasets Store - State management for datasets
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { datasetsApi, type DatasetListParams } from '@/api/datasets';
// assetsApi yerine store'u kullanacağız
import { useAssetsStore } from './assets'; 
import type { Dataset } from '@/types/dataset';
import { getErrorMessage } from '@/types/api';
import { useToastStore } from './toast';

export const useDatasetsStore = defineStore('datasets', () => {
  const toastStore = useToastStore();
  const assetsStore = useAssetsStore(); // Assets store'u buraya dahil ettik

  // State
  const datasets = ref<Dataset[]>([]);
  const currentDataset = ref<Dataset | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Upload state
  const uploading = ref(false);
  const uploadProgress = ref(0);

  // Pagination
  const page = ref(1);
  const limit = ref(10);
  const total = ref(0);
  const totalPages = computed(() => Math.ceil(total.value / limit.value));

  // Search
  const search = ref('');

  /**
   * Fetch paginated datasets list
   */
  async function fetchDatasets(params: DatasetListParams = {}) {
    loading.value = true;
    error.value = null;

    try {
      const response = await datasetsApi.list({
        page: params.page ?? page.value,
        limit: params.limit ?? limit.value,
        search: params.search ?? (search.value || undefined),
      });

      datasets.value = response.data.data;
      total.value = response.data.pagination?.total ?? response.data.data.length;
      page.value = params.page ?? page.value;

      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Datasetler yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch single dataset by ID
   */
  async function fetchDataset(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await datasetsApi.get(id);
      currentDataset.value = response.data.data;
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Dataset yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new dataset
   */
  async function createDataset(data: { name: string; description?: string }) {
    loading.value = true;
    error.value = null;

    try {
      const response = await datasetsApi.create(data);
      datasets.value.unshift(response.data.data);
      total.value += 1;
      toastStore.success('Dataset başarıyla oluşturuldu');
      return response.data.data;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Dataset oluşturulamadı');
      toastStore.error(error.value);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a dataset and upload assets in one atomic flow.
   * Uses AssetsStore for parallel uploading.
   */
  async function createDatasetWithAssets(
    data: { name: string; description?: string },
    files: File[],
  ) {
    loading.value = true;
    uploading.value = false;
    uploadProgress.value = 0;
    error.value = null;

    // Step 1: Create dataset
    let dataset: Dataset | null = null;
    try {
      const response = await datasetsApi.create(data);
      dataset = response.data.data;
      datasets.value.unshift(dataset);
      total.value += 1;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Dataset oluşturulamadı');
      toastStore.error(error.value);
      loading.value = false;
      return null;
    }

    // Step 2: Upload assets using the Assets Store (Parallel)
    uploading.value = true;
    
    // Dataset oluşturuldu, şimdi dosya yükleme işlemini Assets Store'a devrediyoruz.
    // Assets Store kendi progress ve hata yönetimini yapar.
    await assetsStore.uploadAssets(dataset.id, files, { existingAssetCount: 0 });

    // İşlem bittiğinde listeyi yenile
    await fetchDatasets();

    loading.value = false;
    uploading.value = false;
    
    return dataset;
  }

  /**
   * Update an existing dataset
   */
  async function updateDataset(id: string, data: { name?: string; description?: string }) {
    loading.value = true;
    error.value = null;

    try {
      const response = await datasetsApi.update(id, data);
      const index = datasets.value.findIndex((d) => d.id === id);
      if (index > -1) {
        datasets.value[index] = response.data.data;
      }
      if (currentDataset.value?.id === id) {
        currentDataset.value = response.data.data;
      }
      toastStore.success('Dataset başarıyla güncellendi');
      return response.data.data;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Dataset güncellenemedi');
      toastStore.error(error.value);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete a dataset
   */
  async function deleteDataset(id: string) {
    loading.value = true;
    error.value = null;

    try {
      await datasetsApi.delete(id);
      datasets.value = datasets.value.filter((d) => d.id !== id);
      total.value -= 1;
      if (currentDataset.value?.id === id) {
        currentDataset.value = null;
      }
      toastStore.success('Dataset başarıyla silindi');
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Dataset silinemedi');
      toastStore.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Set search term and refetch
   */
  async function setSearch(term: string) {
    search.value = term;
    page.value = 1;
    return fetchDatasets();
  }

  /**
   * Go to specific page
   */
  async function goToPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage;
      return fetchDatasets();
    }
    return false;
  }

  /**
   * Reset store state
   */
  function reset() {
    datasets.value = [];
    currentDataset.value = null;
    loading.value = false;
    uploading.value = false;
    uploadProgress.value = 0;
    error.value = null;
    page.value = 1;
    total.value = 0;
    search.value = '';
  }

  return {
    // State
    datasets,
    currentDataset,
    loading,
    uploading,
    uploadProgress,
    error,
    // Pagination
    page,
    limit,
    total,
    totalPages,
    search,
    // Actions
    fetchDatasets,
    fetchDataset,
    createDataset,
    createDatasetWithAssets,
    updateDataset,
    deleteDataset,
    setSearch,
    goToPage,
    reset,
  };
});