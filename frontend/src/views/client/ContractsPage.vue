<script setup lang="ts">
/**
 * ContractsPage - Client contracts list with status actions
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
import { useRouter } from 'vue-router';

useSeo({
  title: 'Sözleşmeler',
  description: 'Etiketleme sözleşmelerinizi yönetin.',
});

const contractsStore = useContractsStore();
const router = useRouter();

// Status filter options
const statusOptions = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'accepted', label: 'Kabul Edildi' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'submitted', label: 'Gönderildi' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'cancelled', label: 'İptal Edildi' },
];

// Fetch on mount
onMounted(() => {
  contractsStore.fetchContracts();
});

// Confirmation modal
const showConfirmModal = ref(false);
const confirmAction = ref<'accept' | 'reject' | 'cancel' | 'complete' | null>(null);
const confirmContractId = ref<string | null>(null);

function openConfirm(action: 'accept' | 'reject' | 'cancel' | 'complete', contractId: string) {
  confirmAction.value = action;
  confirmContractId.value = contractId;
  showConfirmModal.value = true;
}

async function handleConfirm() {
  if (!confirmContractId.value || !confirmAction.value) return;
  
  const actions = {
    accept: contractsStore.acceptContract,
    reject: contractsStore.rejectContract,
    cancel: contractsStore.cancelContract,
    complete: contractsStore.completeContract,
  };
  
  await actions[confirmAction.value](confirmContractId.value);
  showConfirmModal.value = false;
  confirmAction.value = null;
  confirmContractId.value = null;
}

function getStatusBadge(status: string) {
  const badges: Record<string, string> = {
    pending: 'badge-warning',
    accepted: 'badge-info',
    in_progress: 'badge-info',
    submitted: 'badge-warning',
    revision_requested: 'badge-warning',
    completed: 'badge-success',
    cancelled: 'badge-error',
    rejected: 'badge-error',
  };
  return badges[status] || 'badge-neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Beklemede',
    accepted: 'Kabul Edildi',
    in_progress: 'Devam Ediyor',
    submitted: 'Gönderildi',
    revision_requested: 'Revizyon İstendi',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi',
    rejected: 'Reddedildi',
  };
  return labels[status] || status;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR');
}

function viewTasks(contractId: string) {
  router.push({ name: 'client-contract-detail', params: { id: contractId } });
}

const confirmMessages: Record<string, { title: string; message: string; buttonText: string; buttonVariant: 'primary' | 'danger' | 'secondary' }> = {
  accept: { title: 'Sözleşmeyi Kabul Et', message: 'Bu sözleşmeyi kabul etmek istediğinizden emin misiniz?', buttonText: 'Kabul Et', buttonVariant: 'primary' },
  reject: { title: 'Sözleşmeyi Reddet', message: 'Bu sözleşmeyi reddetmek istediğinizden emin misiniz?', buttonText: 'Reddet', buttonVariant: 'danger' },
  cancel: { title: 'Sözleşmeyi İptal Et', message: 'Bu sözleşmeyi iptal etmek istediğinizden emin misiniz?', buttonText: 'İptal Et', buttonVariant: 'danger' },
  complete: { title: 'Sözleşmeyi Tamamla', message: 'Tüm görevler onaylandı mı? Sözleşmeyi tamamlamak istediğinizden emin misiniz?', buttonText: 'Tamamla', buttonVariant: 'primary' },
};

const currentConfirmMessage = computed(() => {
  if (!confirmAction.value) return null;
  return confirmMessages[confirmAction.value];
});
</script>

<template>
  <AppLayout>
    <template #header>Sözleşmeler</template>

    <!-- Toolbar -->
    <div class="flex justify-between items-center gap-4 mb-6">
      <BaseSelect
        id="status-filter"
        :model-value="contractsStore.statusFilter"
        :options="statusOptions"
        class="w-48"
        aria-label="Durum filtrele"
        @update:model-value="(v) => contractsStore.setStatusFilter(v as ContractStatus | '')"
      />
    </div>

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
              <span>{{ contract.completedAssets }} / {{ contract.assignedAssets }} asset</span>
              <span>{{ formatDate(contract.createdAt) }}</span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <p class="text-lg font-bold text-gray-900 dark:text-white">
              {{ formatPrice(contract.totalPayment, contract.currency) }}
            </p>
            <!-- Actions -->
            <div class="flex gap-2">
              <button
                v-if="contract.status === 'pending'"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                @click="openConfirm('accept', contract.id)"
              >
                Kabul Et
              </button>
              <button
                v-if="contract.status === 'pending'"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                @click="openConfirm('reject', contract.id)"
              >
                Reddet
              </button>
              <button
                v-if="['accepted', 'in_progress', 'submitted'].includes(contract.status)"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                @click="viewTasks(contract.id)"
              >
                Görevleri Gör
              </button>
              <button
                v-if="contract.status === 'submitted'"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                @click="openConfirm('complete', contract.id)"
              >
                Tamamla
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

    <!-- Confirm Modal -->
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
  </AppLayout>
</template>
