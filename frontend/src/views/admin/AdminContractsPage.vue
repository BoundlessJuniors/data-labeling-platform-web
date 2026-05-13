<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminApi, type AdminContractListParams } from '@/api/admin';
import { contractsApi } from '@/api/contracts';
import type { AdminContractListItem } from '@/types/admin';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/types/api';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseInput from '@/components/ui/BaseInput.vue';

const toastStore = useToastStore();
const route = useRoute();
const router = useRouter();

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
  { value: 'disputed', label: 'Disputed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'overdue', label: 'Overdue' },
];

// Modals
const isConfirmModalOpen = ref(false);
const confirmAction = ref<'approve' | 'retry' | 'revision' | 'dispute_refund' | 'dispute_release' | null>(null);
const activeContractId = ref<string>('');
const revisionReason = ref<string>('');
const disputeReason = ref<string>('');
const modalLoading = ref(false);

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

function updateQueryAndFetch() {
  router.replace({
    query: {
      ...route.query,
      page: currentPage.value > 1 ? currentPage.value : undefined,
      status: statusFilter.value || undefined,
    }
  }).catch(() => {});
  fetchContracts();
}

onMounted(() => {
  if (route.query.page) currentPage.value = Number(route.query.page);
  if (route.query.status) statusFilter.value = String(route.query.status);
  fetchContracts();
});

watch(statusFilter, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    currentPage.value = 1;
    updateQueryAndFetch();
  }
});

watch(currentPage, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    updateQueryAndFetch();
  }
});

function promptApprove(id: string) {
  activeContractId.value = id;
  confirmAction.value = 'approve';
  isConfirmModalOpen.value = true;
}

function promptRevision(id: string) {
  activeContractId.value = id;
  revisionReason.value = '';
  confirmAction.value = 'revision';
  isConfirmModalOpen.value = true;
}

function promptRetryNormalize(id: string) {
  activeContractId.value = id;
  confirmAction.value = 'retry';
  isConfirmModalOpen.value = true;
}

function promptDisputeRefund(id: string) {
  activeContractId.value = id;
  disputeReason.value = '';
  confirmAction.value = 'dispute_refund';
  isConfirmModalOpen.value = true;
}

function promptDisputeRelease(id: string) {
  activeContractId.value = id;
  disputeReason.value = '';
  confirmAction.value = 'dispute_release';
  isConfirmModalOpen.value = true;
}

async function executeConfirmAction() {
  if (!activeContractId.value || !confirmAction.value) return;
  
  modalLoading.value = true;
  try {
    if (confirmAction.value === 'approve') {
      await adminApi.approveContract(activeContractId.value);
      toastStore.success('Sözleşme başarıyla onaylandı');
    } else if (confirmAction.value === 'revision') {
      const trimmedReason = revisionReason.value.trim();
      if (trimmedReason === '') {
        toastStore.warning('Revizyon açıklaması boş olamaz');
        modalLoading.value = false;
        return;
      }
      await adminApi.rejectContract(activeContractId.value, trimmedReason);
      toastStore.success('Revizyon talebi gönderildi');
    } else if (confirmAction.value === 'retry') {
      await adminApi.retryNormalize(activeContractId.value);
      toastStore.success('Normalize işlemi yeniden başlatıldı');
    } else if (confirmAction.value === 'dispute_refund') {
      const trimmedReason = disputeReason.value.trim();
      if (trimmedReason === '') {
        toastStore.warning('Karar gerekçesi boş olamaz');
        modalLoading.value = false;
        return;
      }
      await contractsApi.resolveDispute(activeContractId.value, {
        decision: 'refund_client',
        reason: trimmedReason,
      });
      toastStore.success('İtiraz çözüldü. Ödeme müşteriye iade edildi.');
    } else if (confirmAction.value === 'dispute_release') {
      const trimmedReason = disputeReason.value.trim();
      if (trimmedReason === '') {
        toastStore.warning('Karar gerekçesi boş olamaz');
        modalLoading.value = false;
        return;
      }
      await contractsApi.resolveDispute(activeContractId.value, {
        decision: 'release_to_labeler',
        reason: trimmedReason,
      });
      toastStore.success('İtiraz çözüldü. Ödeme labeler\'a aktarıldı.');
    }
    fetchContracts();
    isConfirmModalOpen.value = false;
  } catch (error: unknown) {
    toastStore.error(getErrorMessage(error, 'İşlem başarısız'));
  } finally {
    modalLoading.value = false;
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'active': return 'badge-neutral bg-blue-100 text-blue-800 border-blue-200';
    case 'submitted': return 'badge-neutral bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'approved': return 'badge-success';
    case 'revision_requested': return 'badge-warning';
    case 'disputed': return 'badge-neutral bg-orange-100 text-orange-800 border-orange-200';
    case 'refunded': return 'badge-neutral bg-gray-100 text-gray-600 border-gray-200';
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
                  <div>Başlangıç: {{ contract.startedAt ? new Date(contract.startedAt).toLocaleDateString('tr-TR') : '-' }}</div>
                  <div v-if="contract.completedAt">Bitiş: {{ new Date(contract.completedAt).toLocaleDateString('tr-TR') }}</div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex flex-wrap gap-2 justify-end">
                    <button
                      v-if="contract.status === 'submitted'"
                      class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      @click="promptApprove(contract.id)"
                    >
                      Approve
                    </button>
                    <button
                      v-if="contract.status === 'submitted'"
                      class="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                      @click="promptRevision(contract.id)"
                    >
                      Revizyon İste
                    </button>
                    <button
                      v-if="contract.status === 'submitted'"
                      class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Normalize işlemini kuyruğa tekrar ekle"
                      @click="promptRetryNormalize(contract.id)"
                    >
                      Retry Normalize
                    </button>
                    <button
                      v-if="contract.status === 'disputed'"
                      class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium"
                      title="İtirazı çöz: Müşteriye iade et"
                      @click="promptDisputeRefund(contract.id)"
                    >
                      Müşteriye İade Et
                    </button>
                    <button
                      v-if="contract.status === 'disputed'"
                      class="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 text-xs font-medium"
                      title="İtirazı çöz: Labeler'a öde"
                      @click="promptDisputeRelease(contract.id)"
                    >
                      Labeler'a Öde
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

    <!-- Confirm Modal -->
    <BaseModal
      :open="isConfirmModalOpen"
      :title="
        confirmAction === 'approve' ? 'Sözleşmeyi Onayla' :
        confirmAction === 'revision' ? 'Revizyon Talebi' :
        confirmAction === 'retry' ? 'Normalize Yeniden Başlat' :
        confirmAction === 'dispute_refund' ? 'İtiraz: Müşteriye İade Et' :
        confirmAction === 'dispute_release' ? 'İtiraz: Labeler\'a Öde' : 'İşlemi Onayla'
      "
      size="sm"
      @close="isConfirmModalOpen = false"
    >
      <div class="space-y-4">
        <p v-if="confirmAction === 'approve'" class="text-sm text-gray-600 dark:text-gray-300">
          Bu sözleşmeyi onaylamak istediğinize emin misiniz? Ödeme labeler'a aktarılacaktır.
        </p>
        <p v-if="confirmAction === 'retry'" class="text-sm text-gray-600 dark:text-gray-300">
          Sadece submitted durumdaki ve normalize işlemi failed/pending olan sözleşmeler için kullanılmalıdır. Bu sözleşmedeki taskları tekrar normalize kuyruğuna almak istediğinize emin misiniz?
        </p>
        <div v-if="confirmAction === 'revision'">
          <BaseInput
            id="revision-reason"
            v-model="revisionReason"
            label="Revizyon Sebebi"
            placeholder="Neden revizyon isteniyor..."
          />
        </div>
        <div v-if="confirmAction === 'dispute_refund' || confirmAction === 'dispute_release'" class="space-y-2">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            <span v-if="confirmAction === 'dispute_refund'">Ödeme müşteriye iade edilecek ve ilan yeniden açılacaktır.</span>
            <span v-else>Ödeme labeler'a aktarılacak ve ilan tamamlanmış sayılacaktır.</span>
          </p>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Karar Gerekçesi *</label>
          <textarea
            id="dispute-reason"
            v-model="disputeReason"
            rows="3"
            placeholder="Karar gerekçesini açıklayın..."
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="outline" @click="isConfirmModalOpen = false">İptal</BaseButton>
        <BaseButton
          :variant="(confirmAction === 'approve' || confirmAction === 'dispute_release') ? 'primary' : 'danger'"
          :loading="modalLoading"
          @click="executeConfirmAction"
        >
          Onayla
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
