<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { adminApi, type AdminContractListParams } from '@/api/admin';
import type { AdminContractListItem } from '@/types/admin';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/types/api';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';

const toastStore = useToastStore();

const contracts = ref<AdminContractListItem[]>([]);
const isLoading = ref(true);

const currentPage = ref(1);
const totalPages = ref(1);
const limit = ref(20);

const statusFilter = ref('');
const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'revision_requested', label: 'Revision Requested' },
  { value: 'cancelled', label: 'Cancelled' },
];

async function fetchContracts() {
  isLoading.value = true;
  try {
    const params: AdminContractListParams = { 
      page: currentPage.value, 
      limit: limit.value 
    };
    if (statusFilter.value) params.status = statusFilter.value;
    
    // In admin phase 2, ownOnly defaults to whatever backend assigns, usually false for admin sees all.
    
    const response = await adminApi.getContracts(params);
    contracts.value = response.data.data;
    
    // pagination might be undefined, fallback safely
    const pagination = response.data.pagination;
    totalPages.value = pagination?.totalPages ?? 1;
    currentPage.value = pagination?.page ?? currentPage.value;
  } catch (error: unknown) {
    console.error('Failed to fetch contracts:', error);
    toastStore.error(getErrorMessage(error, 'Sözleşmeler yüklenirken hata oluştu'));
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchContracts();
});

watch(statusFilter, () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1;
  } else {
    fetchContracts();
  }
});

watch(currentPage, () => {
  fetchContracts();
});

async function handleApprove(id: string) {
  if (!window.confirm('Bu sözleşmeyi onaylamak istediğinize emin misiniz?')) return;
  try {
    await adminApi.approveContract(id);
    toastStore.success('Sözleşme başarıyla onaylandı');
    fetchContracts();
  } catch (error: unknown) {
    toastStore.error(getErrorMessage(error, 'Onaylama başarısız'));
  }
}

async function handleRevision(id: string) {
  const reason = window.prompt('Revizyon talebi için bir açıklama girin:');
  if (reason === null) return; // User cancelled
  
  const trimmedReason = reason.trim();
  if (trimmedReason === '') {
    toastStore.warning('Revizyon açıklaması boş olamaz');
    return;
  }

  try {
    await adminApi.rejectContract(id, trimmedReason);
    toastStore.success('Revizyon talebi gönderildi');
    fetchContracts();
  } catch (error: unknown) {
    toastStore.error(getErrorMessage(error, 'Revizyon talebi başarısız'));
  }
}

async function handleRetryNormalize(id: string) {
  try {
    await adminApi.retryNormalize(id);
    toastStore.success('Normalize işlemi yeniden başlatıldı');
    // We don't necessarily need to fetchContracts here unless the status changes immediately on backend
    // but usually normalize is a background job.
    fetchContracts(); 
  } catch (error: unknown) {
    toastStore.error(getErrorMessage(error, 'Normalize hatası'));
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'active': return 'badge-neutral bg-blue-100 text-blue-800 border-blue-200';
    case 'submitted': return 'badge-neutral bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'approved': return 'badge-success';
    case 'revision_requested': return 'badge-warning';
    case 'cancelled': return 'badge-error';
    default: return 'badge-neutral';
  }
}

function truncateString(str: string, len: number = 10) {
  if (!str) return '-';
  return str.length > len ? str.substring(0, len) + '...' : str;
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Contracts Operations</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tüm sözleşmeleri görüntüleyin ve yönetin.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <BaseSelect
          id="admin-contracts-status-filter"
          v-model="statusFilter"
          :options="statusOptions"
          class="w-40 bg-white"
        />
        <BaseButton variant="secondary" @click="fetchContracts">
          Yenile
        </BaseButton>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div v-if="isLoading" class="p-6 space-y-4">
        <BaseSkeleton v-for="i in 5" :key="i" class="h-12 w-full rounded" />
      </div>

      <template v-else-if="contracts.length > 0">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / Listing</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client / Labeler</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price / Tasks</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="contract in contracts" :key="contract.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900 dark:text-white" :title="contract.id">
                    {{ truncateString(contract.id, 8) }}
                  </div>
                  <div class="text-xs text-gray-500 truncate max-w-[200px]" :title="contract.listing?.title">
                    {{ contract.listing?.title || '-' }}
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="['px-2.5 py-1 text-xs font-medium rounded-full border', getStatusBadgeClass(contract.status)]">
                    {{ contract.status }}
                  </span>
                  <div v-if="contract.revisionCount > 0" class="text-xs text-orange-500 mt-1">
                    Revizyon: {{ contract.revisionCount }}
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <div class="text-gray-900 dark:text-gray-200" :title="contract.clientUserId">C: {{ contract.client?.email || truncateString(contract.clientUserId, 8) }}</div>
                  <div class="text-gray-900 dark:text-gray-200 mt-1" :title="contract.labelerUserId">L: {{ contract.labeler?.email || truncateString(contract.labelerUserId, 8) }}</div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div class="font-medium text-gray-900 dark:text-gray-300">{{ contract.agreedPriceTotal }} {{ contract.currency }}</div>
                  <div class="text-xs mt-1">
                    {{ contract._count?.tasks || 0 }} Tasks
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                  <div>Başlangıç: {{ new Date(contract.startedAt).toLocaleDateString('tr-TR') }}</div>
                  <div v-if="contract.completedAt">Bitiş: {{ new Date(contract.completedAt).toLocaleDateString('tr-TR') }}</div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex flex-wrap gap-2 justify-end">
                    <button
                      v-if="contract.status === 'submitted'"
                      class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      @click="handleApprove(contract.id)"
                    >
                      Approve
                    </button>
                    <button
                      v-if="contract.status === 'submitted'"
                      class="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                      @click="handleRevision(contract.id)"
                    >
                      Revizyon İste
                    </button>
                    <button
                      v-if="contract.status === 'submitted' || contract.status === 'revision_requested' || contract.status === 'active'"
                      class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Normalize işlemini kuyruğa tekrar ekle"
                      @click="handleRetryNormalize(contract.id)"
                    >
                      Retry Normalize
                    </button>
                  </div>
                </td>

              </tr>
            </tbody>
          </table>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <BasePagination
            :current-page="currentPage"
            :total-pages="totalPages"
            :loading="isLoading"
            @page-change="currentPage = $event"
          />
        </div>
      </template>

      <div v-else class="p-12">
        <BaseEmptyState
          title="Sözleşme bulunamadı"
          description="Arama kriterlerinize uygun sözleşme kaydı yok."
          icon="document"
        />
      </div>
    </div>
  </div>
</template>
