<script setup lang="ts">
/**
 * ContractsPage - Client contracts list with QC preview and status actions
 */
import { onMounted, ref, computed } from 'vue';
import { useContractsStore } from '@/stores/contracts';
import { useSeo } from '@/composables/useSeo';
import type { ContractStatus } from '@/types/contract';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import ContractQcPreviewModal from '@/components/contracts/ContractQcPreviewModal.vue';

useSeo({
  title: 'Sözleşmeler',
  description: 'Etiketleme sözleşmelerinizi yönetin.',
});

const contractsStore = useContractsStore();

// Status filter options
const statusOptions = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'active', label: 'Aktif' },
  { value: 'submitted', label: 'Gönderildi' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'cancelled', label: 'İptal Edildi' },
];

// Fetch on mount
onMounted(() => {
  contractsStore.fetchContracts();
});

// ── Confirmation modal ──────────────────────────────────────────
const showConfirmModal = ref(false);
const confirmAction = ref<'approve' | 'reject' | 'cancel' | null>(null);
const confirmContractId = ref<string | null>(null);

// ── Rejection reason modal ──────────────────────────────────────
const showRejectReasonModal = ref(false);
const rejectContractId = ref<string | null>(null);
const rejectReason = ref('');

function openConfirm(action: 'approve' | 'reject' | 'cancel', contractId: string) {
  if (action === 'reject') {
    // Open rejection reason modal instead
    rejectContractId.value = contractId;
    rejectReason.value = '';
    showRejectReasonModal.value = true;
    return;
  }
  confirmAction.value = action;
  confirmContractId.value = contractId;
  showConfirmModal.value = true;
}

async function handleConfirm() {
  if (!confirmContractId.value || !confirmAction.value) return;

  const actions = {
    approve: () => contractsStore.approveContract(confirmContractId.value!),
    cancel: () => contractsStore.cancelContract(confirmContractId.value!),
  } as const;

  const actionFn = actions[confirmAction.value as keyof typeof actions];
  if (actionFn) {
    await actionFn();
  }

  showConfirmModal.value = false;
  confirmAction.value = null;
  confirmContractId.value = null;
}

async function handleRejectWithReason() {
  if (!rejectContractId.value) return;
  const reason = rejectReason.value.trim() || undefined;
  await contractsStore.rejectContract(rejectContractId.value, reason);
  showRejectReasonModal.value = false;
  rejectContractId.value = null;
  rejectReason.value = '';
}

// ── QC Preview ──────────────────────────────────────────────────
async function openQcPreview(contractId: string) {
  await contractsStore.fetchQcPreview(contractId);
}

// ── Helpers ─────────────────────────────────────────────────────
function getStatusBadge(status: string) {
  const badges: Record<string, string> = {
    active: 'badge-info',
    submitted: 'badge-warning',
    approved: 'badge-success',
    cancelled: 'badge-error',
    rejected: 'badge-error',
    revision_requested: 'badge-warning',
  };
  return badges[status] || 'badge-neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Aktif',
    submitted: 'Gönderildi',
    approved: 'Onaylandı',
    cancelled: 'İptal Edildi',
    rejected: 'Reddedildi',
    revision_requested: 'Revizyon İstendi',
  };
  return labels[status] || status;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR');
}

function getProgressPercent(contract: { tasks?: { status: string }[]; _count?: { tasks: number } }) {
  const total = contract._count?.tasks ?? 0;
  if (total === 0) return 0;
  const completed = (contract.tasks ?? []).filter(t => t.status === 'accepted' || t.status === 'approved').length;
  return Math.round((completed / total) * 100);
}

function getCompletedCount(contract: { tasks?: { status: string }[] }) {
  return (contract.tasks ?? []).filter(t => t.status === 'accepted' || t.status === 'approved').length;
}

const confirmMessages: Record<string, { title: string; message: string; buttonText: string; buttonVariant: 'primary' | 'danger' | 'secondary' }> = {
  approve: { title: 'Sözleşmeyi Onayla', message: 'Bu sözleşmeyi onaylamak istediğinizden emin misiniz? Bu işlem geri alınamaz.', buttonText: 'Onayla', buttonVariant: 'primary' },
  cancel: { title: 'Sözleşmeyi İptal Et', message: 'Bu sözleşmeyi iptal etmek istediğinizden emin misiniz?', buttonText: 'İptal Et', buttonVariant: 'danger' },
};

const currentConfirmMessage = computed(() => {
  if (!confirmAction.value) return null;
  return confirmMessages[confirmAction.value] ?? null;
});
</script>

<template>
  <AppLayout>
    <template #header>
      <div class="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 class="text-xl font-bold text-gray-900 dark:text-white shrink-0">Sözleşmeler</h1>
        <div class="w-full sm:w-48 md:ml-auto">
          <BaseSelect
            id="status-filter"
            size="sm"
            :model-value="contractsStore.statusFilter"
            :options="statusOptions"
            aria-label="Durum filtrele"
            @update:model-value="(v) => contractsStore.setStatusFilter(v as ContractStatus | '')"
          />
        </div>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="contractsStore.loading && contractsStore.contracts.length === 0" class="space-y-4">
      <div v-for="i in 4" :key="i" class="card">
        <div class="flex justify-between">
          <div class="flex-1">
            <BaseSkeleton variant="text" class="w-1/3 mb-2" />
            <BaseSkeleton variant="text" class="w-1/2 mb-2" />
          </div>
          <BaseSkeleton variant="rectangular" class="w-24 h-8" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="contractsStore.error" class="card text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ contractsStore.error }}</p>
      <BaseButton variant="secondary" @click="contractsStore.fetchContracts()">Tekrar Dene</BaseButton>
    </div>

    <!-- Empty -->
    <BaseEmptyState
      v-else-if="contractsStore.contracts.length === 0"
      icon="database"
      title="Henüz sözleşme yok"
      description="İlanlarınıza başvuru yapıldığında burada görünecektir."
    />

    <!-- List -->
    <div v-else class="space-y-4">
      <article
        v-for="contract in contractsStore.contracts"
        :key="contract.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex flex-col sm:flex-row justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <span :class="getStatusBadge(contract.status)">{{ getStatusLabel(contract.status) }}</span>
            </div>
            <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{{ contract._count?.tasks ?? 0 }} görev</span>
              <span>{{ formatDate(contract.startedAt) }}</span>
            </div>
            <!-- Progress bar -->
            <div class="mt-3">
              <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{{ getCompletedCount(contract) }} / {{ contract._count?.tasks ?? 0 }} tamamlandı</span>
                <span>{{ getProgressPercent(contract) }}%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  class="bg-primary-600 h-2 rounded-full transition-all"
                  :style="{ width: getProgressPercent(contract) + '%' }"
                ></div>
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <p class="text-lg font-bold text-gray-900 dark:text-white">
              {{ formatPrice(contract.agreedPriceTotal, contract.currency) }}
            </p>
            <!-- Actions for submitted contracts -->
            <div v-if="contract.status === 'submitted'" class="flex flex-wrap gap-2">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50 transition-colors"
                :disabled="contractsStore.qcLoading"
                @click="openQcPreview(contract.id)"
              >
                <span v-if="contractsStore.qcLoading && contractsStore.qcPreviewContractId === contract.id" class="flex items-center gap-1">
                  <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Yükleniyor…
                </span>
                <span v-else>QC Önizleme</span>
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
                @click="openConfirm('approve', contract.id)"
              >
                Onayla
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors"
                @click="openConfirm('reject', contract.id)"
              >
                Revizyon İste
              </button>
            </div>
            <!-- Actions for active contracts -->
            <div v-if="contract.status === 'active'" class="flex gap-2">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
                @click="openConfirm('cancel', contract.id)"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- Pagination -->
    <BasePagination
      :current-page="contractsStore.page"
      :total-pages="contractsStore.totalPages"
      :loading="contractsStore.loading"
      class="mt-6"
      @page-change="contractsStore.goToPage"
    />

    <!-- QC Preview Modal -->
    <ContractQcPreviewModal />

    <!-- Confirm Modal (approve / cancel) -->
    <Teleport to="body">
      <div
        v-if="showConfirmModal && confirmAction"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showConfirmModal = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {{ currentConfirmMessage?.title }}
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ currentConfirmMessage?.message }}
          </p>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="showConfirmModal = false">İptal</BaseButton>
            <BaseButton
              :variant="currentConfirmMessage?.buttonVariant ?? 'primary'"
              :loading="contractsStore.loading"
              @click="handleConfirm"
            >
              {{ currentConfirmMessage?.buttonText }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Rejection Reason Modal -->
    <Teleport to="body">
      <div
        v-if="showRejectReasonModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showRejectReasonModal = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Revizyon İste
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Lütfen revizyon isteğinizin nedenini açıklayın. Bu bilgi labeler'a iletilecektir.
          </p>
          <textarea
            v-model="rejectReason"
            class="input resize-none"
            rows="3"
            placeholder="Revizyon nedeni (opsiyonel)"
          />
          <div class="flex justify-end gap-3 mt-4">
            <BaseButton variant="secondary" @click="showRejectReasonModal = false">İptal</BaseButton>
            <BaseButton
              variant="danger"
              :loading="contractsStore.loading"
              @click="handleRejectWithReason"
            >
              Revizyon İste
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
