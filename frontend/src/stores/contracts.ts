/**
 * Contracts Store - State management for contracts
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { contractsApi, type ContractListParams } from '@/api/contracts';
import { paymentsApi } from '@/api/payments';
import { tasksApi } from '@/api/tasks';
import type { Contract, ContractWithDetails, ContractStatus } from '@/types/contract';
import type { Payment } from '@/types/payment';
import type { QcSampleResponse, QcTaskView } from '@/types/qc';
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

  // ── QC Preview State ──────────────────────────────────────────────
  const qcPreviewOpen = ref(false);
  const qcPreviewContractId = ref<string | null>(null);
  const qcSample = ref<QcSampleResponse | null>(null);
  const qcTaskViews = ref<Map<string, QcTaskView>>(new Map());
  const qcLoading = ref(false);
  const qcError = ref<string | null>(null);

  // ── Export State ──────────────────────────────────────────────────
  const exportLoadingMap = ref<Record<string, boolean>>({});

  // ── Payment State ─────────────────────────────────────────────────
  const paymentLoadingMap = ref<Record<string, boolean>>({});

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
   * Approve a contract (client approves labeler's work)
   */
  async function approveContract(id: string) {
    loading.value = true;
    try {
      const response = await contractsApi.approve(id);
      updateContractInList(id, response.data.data);
      toastStore.success('Sözleşme onaylandı');
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'Sözleşme onaylanamadı'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Reject a contract (client requests revision)
   */
  async function rejectContract(id: string, reason?: string) {
    loading.value = true;
    try {
      const response = await contractsApi.reject(id, reason);
      updateContractInList(id, response.data.data);
      toastStore.success('Revizyon istendi');
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'Revizyon istenemedi'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Cancel a contract
   */
  async function cancelContract(id: string, reason?: string) {
    loading.value = true;
    try {
      const response = await contractsApi.cancel(id, reason);
      updateContractInList(id, response.data.data);
      if (response.data.data.status === 'disputed') {
        toastStore.success('İptal talebi itiraza taşındı. Admin incelemesi bekleniyor.');
      } else {
        toastStore.success('Sözleşme iptal edildi');
      }
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'Sözleşme iptal edilemedi'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Complete a contract (legacy — backend may not support)
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

  // ── Payment Actions ───────────────────────────────────────────────

  async function mockPayContract(contractId: string) {
  paymentLoadingMap.value[contractId] = true;

  try {
    let payment: Payment | null = null;

    try {
      const paymentRes = await paymentsApi.getByContract(contractId);
      payment = paymentRes.data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        const initRes = await paymentsApi.initForContract(contractId);
        payment = initRes.data.data;
      } else {
        throw err;
      }
    }

    if (!payment) {
      const initRes = await paymentsApi.initForContract(contractId);
      payment = initRes.data.data;
    }

    await paymentsApi.mockSuccess(payment.id);

    toastStore.success('Ödeme tamamlandı. Sözleşme aktif hale getirildi.');
    await fetchContracts();

    return true;
  } catch (_err) {
    toastStore.error(getErrorMessage(_err, 'Ödeme tamamlanamadı'));
    return false;
  } finally {
    paymentLoadingMap.value[contractId] = false;
  }
}

  // ── Export Actions ────────────────────────────────────────────────
  
  /**
   * Export approved contract data
   */
  async function downloadContractExport(contractId: string, format: 'COCO' | 'YOLO' | 'VOC') {
    exportLoadingMap.value[contractId] = true;
    try {
      const response = await contractsApi.export(contractId, format);
      const blob = response.data;
      
      // Try to parse filename from Content-Disposition
      let filename = `contract-${contractId}.${format.toLowerCase()}`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      } else {
        // Fallback extensions
        if (format === 'COCO') filename += '.json';
        else filename += '.zip';
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toastStore.success('Dışa aktarım indirildi');
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'Dışa aktarım başarısız oldu'));
      return false;
    } finally {
      exportLoadingMap.value[contractId] = false;
    }
  }

  // ── QC Preview Actions ────────────────────────────────────────────

  /**
   * Fetch QC preview: sample tasks + individual QC views
   */
  async function fetchQcPreview(contractId: string) {
    qcLoading.value = true;
    qcError.value = null;
    qcSample.value = null;
    qcTaskViews.value = new Map();
    qcPreviewContractId.value = contractId;

    try {
      // 1. Fetch QC sample (5 random tasks)
      const sampleRes = await contractsApi.getQcSample(contractId, 5);
      qcSample.value = sampleRes.data.data;

      if (qcSample.value.tasks.length === 0) {
        qcPreviewOpen.value = true;
        return true;
      }

      // 2. Fetch detailed QC view for each sample task
      const viewPromises = qcSample.value.tasks.map(async (task) => {
        try {
          const viewRes = await tasksApi.getQcView(task.id);
          return { taskId: task.id, view: viewRes.data.data };
        } catch (err) {
          console.warn(`Failed to fetch QC view for task ${task.id}:`, err);
          return null;
        }
      });

      const views = await Promise.all(viewPromises);
      const viewMap = new Map<string, QcTaskView>();
      for (const result of views) {
        if (result) {
          viewMap.set(result.taskId, result.view);
        }
      }
      qcTaskViews.value = viewMap;

      qcPreviewOpen.value = true;
      return true;
    } catch (_err) {
      qcError.value = getErrorMessage(_err, 'QC önizleme yüklenemedi');
      toastStore.error(qcError.value);
      return false;
    } finally {
      qcLoading.value = false;
    }
  }

  /**
   * Close QC preview modal and reset state
   */
  function closeQcPreview() {
    qcPreviewOpen.value = false;
    qcPreviewContractId.value = null;
    qcSample.value = null;
    qcTaskViews.value = new Map();
    qcError.value = null;
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
    closeQcPreview();
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
    // QC Preview State
    qcPreviewOpen,
    qcPreviewContractId,
    qcSample,
    qcTaskViews,
    qcLoading,
    qcError,
    exportLoadingMap,
    paymentLoadingMap,
    // Actions
    fetchContracts,
    fetchContract,
    approveContract,
    rejectContract,
    cancelContract,
    completeContract,
    downloadContractExport,
    setStatusFilter,
    goToPage,
    reset,
    mockPayContract,
    // QC Preview Actions
    fetchQcPreview,
    closeQcPreview,
  };
});

