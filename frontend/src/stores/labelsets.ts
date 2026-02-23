/**
 * LabelSets Store - State management for label sets
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { labelsetsApi, type LabelSet, type CreateLabelSetPayload, type UpdateLabelSetPayload } from '@/api/labelsets';
import { getErrorMessage } from '@/types/api';
import { useToastStore } from './toast';

export const useLabelSetsStore = defineStore('labelSets', () => {
  const toastStore = useToastStore();

  // State
  const labelSets = ref<LabelSet[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch all label sets (first page, high limit)
   */
  async function fetchLabelSets() {
    loading.value = true;
    error.value = null;

    try {
      const response = await labelsetsApi.list({ limit: 100 });
      labelSets.value = response.data.data;
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Etiket setleri yüklenemedi');
      toastStore.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new label set with labels
   */
  async function createLabelSet(data: CreateLabelSetPayload): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      await labelsetsApi.create(data);
      toastStore.success('Etiket seti başarıyla oluşturuldu');
      await fetchLabelSets();
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Etiket seti oluşturulamadı');
      toastStore.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update a label set (name and/or replace labels)
   */
  async function updateLabelSet(id: string, data: UpdateLabelSetPayload): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      await labelsetsApi.update(id, data);
      toastStore.success('Etiket seti başarıyla güncellendi');
      await fetchLabelSets();
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Etiket seti güncellenemedi');
      toastStore.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete a label set by ID
   */
  async function deleteLabelSet(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      await labelsetsApi.remove(id);
      toastStore.success('Etiket seti başarıyla silindi');
      await fetchLabelSets();
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Etiket seti silinemedi');
      toastStore.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get a label set by ID from the local cache
   */
  function getLabelSetById(id: string): LabelSet | undefined {
    return labelSets.value.find((ls) => ls.id === id);
  }

  /**
   * Reset store state
   */
  function reset() {
    labelSets.value = [];
    loading.value = false;
    error.value = null;
  }

  return {
    // State
    labelSets,
    loading,
    error,
    // Actions
    fetchLabelSets,
    createLabelSet,
    updateLabelSet,
    deleteLabelSet,
    getLabelSetById,
    reset,
  };
});

