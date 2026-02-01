/**
 * Datasets Store - State management for datasets
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { datasetsApi, type DatasetListParams } from '@/api/datasets';
import type { Dataset } from '@/types/dataset';
import { getErrorMessage } from '@/types/api';
import { useToastStore } from './toast';

export const useDatasetsStore = defineStore('datasets', () => {
  const toastStore = useToastStore();

  // State
  const datasets = ref<Dataset[]>([]);
  const currentDataset = ref<Dataset | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

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
    updateDataset,
    deleteDataset,
    setSearch,
    goToPage,
    reset,
  };
});
