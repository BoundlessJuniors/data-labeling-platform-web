<script setup lang="ts">
/**
 * MyContractsPage - Labeler's accepted contracts
 */
import { ref, onMounted, computed } from 'vue';
import { useSeo } from '@/composables/useSeo';
import apiClient from '@/api/client';
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
  status: string;
  assignedAssets: number;
  completedAssets: number;
  totalPayment: number;
  currency: string;
  createdAt: string;
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
    const response = await apiClient.get('/contracts/my', {
      params: { page: page.value, limit: limit.value },
    });

    contracts.value = response.data.data;
    total.value = response.data.pagination?.total ?? response.data.data.length;
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
    pending: 'Onay Bekleniyor',
    accepted: 'Kabul Edildi',
    in_progress: 'Devam Ediyor',
    submitted: 'Gönderildi',
    revision_requested: 'Revizyon',
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

function getProgressPercent(completed: number, total: number) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
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
        class="card hover:shadow-lg transition-shadow cursor-pointer"
        @click="viewTasks(contract.id)"
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
              Müşteri: {{ contract.clientName }} • {{ formatDate(contract.createdAt) }}
            </p>
            <!-- Progress bar -->
            <div class="mt-3">
              <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{{ contract.completedAssets }} / {{ contract.assignedAssets }} tamamlandı</span>
                <span>{{ getProgressPercent(contract.completedAssets, contract.assignedAssets) }}%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  class="bg-primary-600 h-2 rounded-full transition-all"
                  :style="{ width: getProgressPercent(contract.completedAssets, contract.assignedAssets) + '%' }"
                ></div>
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <p class="text-lg font-bold text-gray-900 dark:text-white">
              {{ formatPrice(contract.totalPayment, contract.currency) }}
            </p>
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
