/**
 * LabelSets Store - State management for label sets
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { labelsetsApi, type LabelSet } from '@/api/labelsets';
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
    getLabelSetById,
    reset,
  };
});
