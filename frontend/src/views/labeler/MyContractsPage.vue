<script setup lang="ts">
/**
 * MyContractsPage - Labeler's accepted contracts
 */
import { ref, onMounted, computed } from 'vue';
import { useSeo } from '@/composables/useSeo';
import { contractsApi } from '@/api/contracts';
import type { Contract, ContractStatus } from '@/types/contract';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import { useRouter } from 'vue-router';

useSeo({
  title: 'Sözleşmelerim',
  description: 'Kabul ettiğiniz etiketleme sözleşmelerini görüntüleyin.',
});

const router = useRouter();

interface MyContract {
  id: string;
  listingTitle: string;
  clientName: string;
  status: ContractStatus;
  assignedAssets: number;
  totalPayment: number;
  currency: string;
  startedAt?: string | null;
  dueAt?: string | null;
  autoCancelAt?: string | null;
  revisionDueAt?: string | null;
  revisionReason?: string | null;
  submittedAt?: string | null;
  reviewDueAt?: string | null;
  approvedAt?: string | null;
  refundedAt?: string | null;
  disputedAt?: string | null;
  disputeReason?: string | null;
  cancelledAt?: string | null;
}

// State
const contracts = ref<MyContract[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref(1);
const total = ref(0);
const limit = ref(10);
const totalPages = computed(() => Math.ceil(total.value / limit.value));

async function fetchContracts() {
  loading.value = true;
  error.value = null;

  try {
    const response = await contractsApi.list({
      page: page.value,
      limit: limit.value,
    });

    const data: Contract[] = response.data.data;

    contracts.value = data.map((item) => ({
      id: item.id,
      listingTitle: item.listing?.title ?? '',
      clientName: item.client?.displayName ?? item.client?.email ?? '',
      status: item.status,
      assignedAssets: item._count?.tasks ?? 0,
      totalPayment: item.agreedPriceTotal ?? 0,
      currency: item.currency,
      startedAt: item.startedAt,
      dueAt: item.dueAt,
      autoCancelAt: item.autoCancelAt,
      revisionDueAt: item.revisionDueAt,
      revisionReason: item.revisionReason,
      submittedAt: item.submittedAt,
      reviewDueAt: item.reviewDueAt,
      approvedAt: item.approvedAt,
      refundedAt: item.refundedAt,
      disputedAt: item.disputedAt,
      disputeReason: item.disputeReason,
      cancelledAt: item.cancelledAt,
    }));

    total.value = response.data.pagination?.total ?? data.length;
  } catch (_err) {
    error.value = 'Sözleşmeler yüklenemedi';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchContracts);

function goToPage(newPage: number) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
    fetchContracts();
  }
}

function viewTasks(contractId: string) {
  router.push({ name: 'labeler-tasks', query: { contractId } });
}

function getStatusBadge(status: string) {
  const badges: Record<string, string> = {
    pending_payment: 'badge-warning',
    active: 'badge-info',
    overdue: 'badge-error',
    submitted: 'badge-warning',
    revision_requested: 'badge-warning',
    approved: 'badge-success',
    cancelled: 'badge-error',
    refunded: 'badge-error',
    disputed: 'badge-error',
    completed: 'badge-success', // legacy
    rejected: 'badge-error',    // legacy
  };
  return badges[status] || 'badge-neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_payment: 'Ödeme Bekleniyor',
    active: 'Aktif',
    overdue: 'Gecikmiş',
    submitted: 'Teslim Edildi',
    revision_requested: 'Revizyon İstendi',
    approved: 'Onaylandı',
    cancelled: 'İptal Edildi',
    refunded: 'İade Edildi',
    disputed: 'İtirazda',
    completed: 'Tamamlandı', // legacy
    rejected: 'Reddedildi',  // legacy
  };
  return labels[status] || status;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<template>
  <AppLayout>
    <template #header>Sözleşmelerim</template>

    <!-- Loading -->
    <div v-if="loading && contracts.length === 0" class="space-y-4">
      <div v-for="i in 4" :key="i" class="card">
        <BaseSkeleton variant="text" class="w-1/3 mb-2" />
        <BaseSkeleton variant="text" class="w-1/2 mb-2" />
        <BaseSkeleton variant="rectangular" class="w-full h-2 mt-3" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
      <BaseButton variant="secondary" @click="fetchContracts">Tekrar Dene</BaseButton>
    </div>

    <!-- Empty -->
    <BaseEmptyState
      v-else-if="contracts.length === 0"
      icon="database"
      title="Henüz sözleşme yok"
      description="İlanlara başvurup kabul edildiğinizde burada görünecektir."
    >
      <template #action>
        <BaseButton variant="primary" @click="$router.push({ name: 'labeler-listings' })">
          İlanları Gör
        </BaseButton>
      </template>
    </BaseEmptyState>

    <!-- List -->
    <div v-else class="space-y-4">
      <article
        v-for="contract in contracts"
        :key="contract.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex flex-col sm:flex-row justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h2 class="font-semibold text-gray-900 dark:text-white truncate">
                {{ contract.listingTitle }}
              </h2>
              <span :class="getStatusBadge(contract.status)">{{ getStatusLabel(contract.status) }}</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Müşteri: {{ contract.clientName }}
              <span v-if="contract.startedAt"> • Başlangıç: {{ formatDate(contract.startedAt) }}</span>
              <span v-if="['active', 'overdue'].includes(contract.status) && contract.dueAt"> • Teslim Tarihi: {{ formatDate(contract.dueAt) }}</span>
              <span v-if="contract.status === 'revision_requested' && contract.revisionDueAt"> • Revizyon Teslimi: {{ formatDate(contract.revisionDueAt) }}</span>
              <span v-if="contract.status === 'submitted' && contract.submittedAt"> • Teslim: {{ formatDate(contract.submittedAt) }}</span>
              <span v-if="contract.status === 'approved' && contract.approvedAt"> • Onay: {{ formatDate(contract.approvedAt) }}</span>
              <span v-if="contract.status === 'refunded' && contract.refundedAt"> • İade: {{ formatDate(contract.refundedAt) }}</span>
              <span v-if="contract.status === 'cancelled' && contract.cancelledAt"> • İptal: {{ formatDate(contract.cancelledAt) }}</span>
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {{ contract.assignedAssets }} görev
            </p>
            
            <div v-if="contract.status === 'overdue' && contract.autoCancelAt" class="mt-2 text-xs text-red-500">
              Teslim süresi geçmiş. {{ formatDate(contract.autoCancelAt) }} tarihinden önce teslim etmezseniz iptal edilecek.
            </div>
            <div v-if="contract.status === 'revision_requested' && contract.revisionReason" class="mt-2 text-xs text-yellow-600">
              Revizyon nedeni: {{ contract.revisionReason }}
            </div>
            <div v-if="contract.status === 'disputed' && contract.disputeReason" class="mt-2 text-xs text-red-500">
              İtiraz nedeni: {{ contract.disputeReason }}
            </div>
          </div>
          <div class="flex flex-col items-end gap-2 text-right">
            <p class="text-lg font-bold text-gray-900 dark:text-white">
              {{ formatPrice(contract.totalPayment, contract.currency) }}
            </p>
            
            <template v-if="contract.status === 'pending_payment'">
              <p class="text-sm text-yellow-600 dark:text-yellow-400 max-w-xs">Müşteri ödemeyi tamamladıktan sonra işe başlayabilirsiniz.</p>
            </template>
            
            <template v-else-if="contract.status === 'submitted'">
              <p class="text-sm text-yellow-600 dark:text-yellow-400">Teslim edildi, müşteri incelemesi bekleniyor.</p>
            </template>
            
            <template v-else-if="contract.status === 'approved' || contract.status === 'completed'">
              <p class="text-sm text-green-600 dark:text-green-400">Onaylandı / tamamlandı.</p>
            </template>
            
            <template v-else-if="contract.status === 'refunded'">
              <p class="text-sm text-red-600 dark:text-red-400">İade edildi.</p>
            </template>
            
            <template v-else-if="contract.status === 'disputed'">
              <p class="text-sm text-red-600 dark:text-red-400">Admin incelemesi gerekiyor.</p>
            </template>
            
            <template v-else-if="contract.status === 'cancelled' || contract.status === 'rejected'">
              <p class="text-sm text-gray-500">İptal edildi.</p>
            </template>

            <template v-else>
              <BaseButton variant="primary" size="sm" @click="viewTasks(contract.id)">
                Görevlere Git
              </BaseButton>
            </template>
          </div>
        </div>
      </article>
    </div>

    <!-- Pagination -->
    <BasePagination
      :current-page="page"
      :total-pages="totalPages"
      :loading="loading"
      class="mt-6"
      @page-change="goToPage"
    />
  </AppLayout>
</template>
