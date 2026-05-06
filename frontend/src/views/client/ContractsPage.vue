<script setup lang="ts">
/**
 * ContractsPage - Client contracts list with QC preview and status actions
 */
import { onMounted, ref, computed } from 'vue';
import { useContractsStore } from '@/stores/contracts';
import { useToastStore } from '@/stores/toast';
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

const statusOptions = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'pending_payment', label: 'Ödeme Bekliyor' },
  { value: 'active', label: 'Aktif' },
  { value: 'overdue', label: 'Gecikmiş' },
  { value: 'submitted', label: 'Gönderildi' },
  { value: 'revision_requested', label: 'Revizyon İstendi' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'cancelled', label: 'İptal Edildi' },
  { value: 'refunded', label: 'İade Edildi' },
  { value: 'disputed', label: 'İtirazda' },
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

// ── Cancel reason modal ─────────────────────────────────────────
const showCancelReasonModal = ref(false);
const cancelContractId = ref<string | null>(null);
const cancelReason = ref('');

// ── Mock Payment Modal ──────────────────────────────────────────
const showMockPaymentModal = ref(false);
const mockPaymentContractId = ref<string | null>(null);

function openMockPayment(contractId: string) {
  mockPaymentContractId.value = contractId;
  showMockPaymentModal.value = true;
}

async function handleMockPayment() {
  if (mockPaymentContractId.value) {
    await contractsStore.mockPayContract(mockPaymentContractId.value);
    showMockPaymentModal.value = false;
    mockPaymentContractId.value = null;
  }
}

// ── Export Format Map ───────────────────────────────────────────
const formatMap = ref<Record<string, 'COCO' | 'YOLO' | 'VOC'>>({});

function openConfirm(action: 'approve' | 'reject' | 'cancel', contractId: string) {
  if (action === 'reject') {
    // Open rejection reason modal instead
    rejectContractId.value = contractId;
    rejectReason.value = '';
    showRejectReasonModal.value = true;
    return;
  }
  if (action === 'cancel') {
    // Open cancel reason modal instead
    cancelContractId.value = contractId;
    cancelReason.value = '';
    showCancelReasonModal.value = true;
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
  } as const;

  const actionFn = actions[confirmAction.value as keyof typeof actions];
  if (actionFn) {
    await actionFn();
  }

  showConfirmModal.value = false;
  confirmAction.value = null;
  confirmContractId.value = null;
}

async function handleCancelWithReason() {
  if (!cancelContractId.value) return;
  const reason = cancelReason.value.trim();
  if (!reason) {
    useToastStore().error('İptal nedeni zorunludur.');
    return;
  }
  await contractsStore.cancelContract(cancelContractId.value, reason);
  showCancelReasonModal.value = false;
  cancelContractId.value = null;
  cancelReason.value = '';
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
    pending_payment: 'badge-warning',
    active: 'badge-info',
    overdue: 'badge-warning',
    submitted: 'badge-warning',
    revision_requested: 'badge-warning',
    approved: 'badge-success',
    cancelled: 'badge-neutral',
    refunded: 'badge-neutral',
    disputed: 'badge-error',
  };
  return badges[status] || 'badge-neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_payment: 'Ödeme Bekliyor',
    active: 'Aktif',
    overdue: 'Gecikmiş',
    submitted: 'Gönderildi',
    revision_requested: 'Revizyon İstendi',
    approved: 'Onaylandı',
    cancelled: 'İptal Edildi',
    refunded: 'İade Edildi',
    disputed: 'İtirazda',
  };
  return labels[status] || status;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
}

function formatDate(dateString?: string | null) {
  if (!dateString) return 'Henüz başlamadı';
  return new Date(dateString).toLocaleDateString('tr-TR');
}

const confirmMessages: Record<string, { title: string; message: string; buttonText: string; buttonVariant: 'primary' | 'danger' | 'secondary' }> = {
  approve: { title: 'Sözleşmeyi Onayla', message: 'Bu sözleşmeyi onaylamak istediğinizden emin misiniz? Bu işlem geri alınamaz.', buttonText: 'Onayla', buttonVariant: 'primary' },
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
        class="group rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 p-2"
      >
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <!-- Left content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start gap-4">
              <div class="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6M7 4h7l3 3v13a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" />
                </svg>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                  <span class="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Sözleşme
                  </span>
                  <span :class="getStatusBadge(contract.status)">
                    {{ getStatusLabel(contract.status) }}
                  </span>
                </div>

                <h2
                  class="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors"
                  :title="contract.listing?.title || 'İsimsiz Sözleşme'"
                >
                  {{ contract.listing?.title || 'İsimsiz Sözleşme' }}
                </h2>

                <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <div class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    <span>{{ contract._count?.tasks ?? 0 }} görev</span>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3M5 11h14M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Başlangıç: {{ formatDate(contract.startedAt) }}</span>
                  </div>
                </div>

                <div
                  v-if="contract.status === 'overdue'"
                  class="mt-3 inline-flex items-center rounded-lg bg-orange-50 dark:bg-orange-900/20 px-3 py-1 text-xs font-medium text-orange-700 dark:text-orange-300"
                >
                  Teslim süresi geçmiş olabilir.
                </div>
              </div>
            </div>
          </div>

          <!-- Right action panel -->
          <div class="lg:w-56 shrink-0 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 p-4">
            <p class="text-right text-xl font-extrabold text-gray-900 dark:text-white">
              {{ formatPrice(contract.agreedPriceTotal, contract.currency) }}
            </p>

            <div v-if="contract.status === 'pending_payment'" class="mt-4 flex flex-col gap-2">
              <BaseButton
                class="w-full justify-center"
                variant="primary"
                size="sm"
                @click="openMockPayment(contract.id)"
              >
                Test Ödemesini Tamamla
              </BaseButton>

              <BaseButton
                class="w-full justify-center"
                variant="danger"
                size="sm"
                @click="contractsStore.cancelContract(contract.id)"
              >
                Vazgeç / İptal Et
              </BaseButton>

              <p class="text-[11px] text-gray-500 dark:text-gray-400 text-center leading-snug">
                Test ödeme adımı tamamlanınca sözleşme demo modunda aktif hale gelir.
              </p>
            </div>

            <div v-if="contract.status === 'submitted'" class="mt-4 flex flex-col gap-2">
              <button
                type="button"
                class="w-full px-3 py-2 text-xs font-medium rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50 transition-colors"
                :disabled="contractsStore.qcLoading"
                @click="openQcPreview(contract.id)"
              >
                <span v-if="contractsStore.qcLoading && contractsStore.qcPreviewContractId === contract.id" class="flex items-center justify-center gap-1">
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
                class="w-full px-3 py-2 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
                @click="openConfirm('approve', contract.id)"
              >
                Onayla
              </button>

              <button
                type="button"
                class="w-full px-3 py-2 text-xs font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors"
                @click="openConfirm('reject', contract.id)"
              >
                Revizyon İste
              </button>
            </div>

            <div v-if="contract.status === 'approved'" class="mt-4 flex flex-col gap-2">
              <select
                class="select select-sm select-bordered rounded-lg bg-white dark:bg-gray-800 text-sm w-full"
                :value="formatMap[contract.id] || 'COCO'"
                @change="(e) => formatMap[contract.id] = (e.target as HTMLSelectElement).value as 'COCO' | 'YOLO' | 'VOC'"
              >
                <option value="COCO">COCO JSON</option>
                <option value="YOLO">YOLO ZIP</option>
                <option value="VOC">VOC ZIP</option>
              </select>

              <button
                type="button"
                class="w-full px-3 py-2 text-xs font-medium rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
                :disabled="contractsStore.exportLoadingMap[contract.id]"
                @click="contractsStore.downloadContractExport(contract.id, formatMap[contract.id] || 'COCO')"
              >
                <span v-if="contractsStore.exportLoadingMap[contract.id]" class="flex items-center justify-center gap-1">
                  <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Hazırlanıyor…
                </span>
                <span v-else>Çıktıyı İndir</span>
              </button>
            </div>

            <div
              v-if="contract.status === 'active' || contract.status === 'overdue' || contract.status === 'revision_requested'"
              class="mt-4"
            >
              <button
                type="button"
                class="w-full px-3 py-2 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
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
    <!-- Cancel Reason Modal -->
    <Teleport to="body">
      <div
        v-if="showCancelReasonModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showCancelReasonModal = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Sözleşmeyi İptal Et
          </h3>
          <p class="text-sm text-orange-600 dark:text-orange-400 font-medium mb-2">
            Ödeme yapılmış aktif sözleşmelerde iptal işlemi doğrudan iade oluşturmaz. Talep admin incelemesine/itiraza taşınır.
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Lütfen iptal nedenini detaylı bir şekilde açıklayın.
          </p>
          <textarea
            v-model="cancelReason"
            class="input resize-none w-full"
            rows="3"
            placeholder="İptal nedeni (zorunlu)"
          />
          <div class="flex justify-end gap-3 mt-4">
            <BaseButton variant="secondary" @click="showCancelReasonModal = false">Vazgeç</BaseButton>
            <BaseButton
              variant="danger"
              :loading="contractsStore.loading"
              @click="handleCancelWithReason"
            >
              İptal Talebi Oluştur
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Mock Payment Modal -->
    <Teleport to="body">
      <div
        v-if="showMockPaymentModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showMockPaymentModal = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Test Ödemesini Tamamla
          </h3>
          <div class="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p class="text-sm text-yellow-800 dark:text-yellow-200">
              Bu gerçek bir ödeme değildir. Kart bilgisi alınmaz. Bu adım yalnızca sözleşme yaşam döngüsünü test etmek için kullanılır. Onayladığınızda sözleşme demo modunda aktif hale gelecektir.
            </p>
          </div>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="showMockPaymentModal = false">İptal</BaseButton>
            <BaseButton
              variant="primary"
              :loading="mockPaymentContractId ? contractsStore.paymentLoadingMap[mockPaymentContractId] : false"
              @click="handleMockPayment"
            >
              Test Ödemesini Tamamla
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
