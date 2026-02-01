/**
 * Contracts Store - State management for contracts
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { contractsApi, type ContractListParams } from '@/api/contracts';
import type { Contract, ContractWithDetails, ContractStatus } from '@/types/contract';
import { getErrorMessage } from '@/types/api';
import { useToastStore } from './toast';

export const useContractsStore = defineStore('contracts', () => {
  const toastStore = useToastStore();

  // State
  const contracts = ref<Contract[]>([]);
  const currentContract = ref<ContractWithDetails | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Pagination
  const page = ref(1);
  const limit = ref(10);
  const total = ref(0);
  const totalPages = computed(() => Math.ceil(total.value / limit.value));

  // Filters
  const statusFilter = ref<ContractStatus | ''>('');

  /**
   * Fetch paginated contracts list
   */
  async function fetchContracts(params: ContractListParams = {}) {
    loading.value = true;
    error.value = null;

    try {
      const response = await contractsApi.list({
        page: params.page ?? page.value,
        limit: params.limit ?? limit.value,
        status: params.status ?? (statusFilter.value || undefined),
      });

      contracts.value = response.data.data;
      total.value = response.data.pagination?.total ?? response.data.data.length;
      page.value = params.page ?? page.value;

      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Sözleşmeler yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch single contract by ID
   */
  async function fetchContract(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await contractsApi.get(id);
      currentContract.value = response.data.data;
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Sözleşme yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Accept a contract
   */
  async function acceptContract(id: string) {
    loading.value = true;
    try {
      const response = await contractsApi.accept(id);
      updateContractInList(id, response.data.data);
      toastStore.success('Sözleşme kabul edildi');
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'Sözleşme kabul edilemedi'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Reject a contract
   */
  async function rejectContract(id: string) {
    loading.value = true;
    try {
      const response = await contractsApi.reject(id);
      updateContractInList(id, response.data.data);
      toastStore.success('Sözleşme reddedildi');
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'Sözleşme reddedilemedi'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Cancel a contract
   */
  async function cancelContract(id: string) {
    loading.value = true;
    try {
      const response = await contractsApi.cancel(id);
      updateContractInList(id, response.data.data);
      toastStore.success('Sözleşme iptal edildi');
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'Sözleşme iptal edilemedi'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Complete a contract
   */
  async function completeContract(id: string) {
    loading.value = true;
    try {
      const response = await contractsApi.complete(id);
      updateContractInList(id, response.data.data);
      toastStore.success('Sözleşme tamamlandı');
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'Sözleşme tamamlanamadı'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  function updateContractInList(id: string, updatedContract: Contract) {
    const index = contracts.value.findIndex((c) => c.id === id);
    if (index > -1) {
      contracts.value[index] = updatedContract;
    }
  }

  /**
   * Set status filter and refetch
   */
  async function setStatusFilter(status: ContractStatus | '') {
    statusFilter.value = status;
    page.value = 1;
    return fetchContracts();
  }

  /**
   * Go to specific page
   */
  async function goToPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage;
      return fetchContracts();
    }
    return false;
  }

  /**
   * Reset store state
   */
  function reset() {
    contracts.value = [];
    currentContract.value = null;
    loading.value = false;
    error.value = null;
    page.value = 1;
    total.value = 0;
    statusFilter.value = '';
  }

  return {
    // State
    contracts,
    currentContract,
    loading,
    error,
    // Pagination
    page,
    limit,
    total,
    totalPages,
    statusFilter,
    // Actions
    fetchContracts,
    fetchContract,
    acceptContract,
    rejectContract,
    cancelContract,
    completeContract,
    setStatusFilter,
    goToPage,
    reset,
  };
});
