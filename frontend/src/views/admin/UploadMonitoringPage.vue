<script setup lang="ts">
/**
 * UploadMonitoringPage - Asset pipeline state monitoring
 * Shows application-known upload/pipeline state, NOT storage existence verification.
 * Rendered inside AdminLayout.
 */
import { ref, onMounted, watch, computed } from 'vue';
import { useSeo } from '@/composables/useSeo';
import { adminApi } from '@/api/admin';
import type { AdminUploadMonitoringItem, AdminAssetStatus } from '@/types/admin';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';

useSeo({
  title: 'Upload Monitoring',
  description: 'Asset pipeline durumunu izleyin.',
});

// State
const assets = ref<AdminUploadMonitoringItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref(1);
const total = ref(0);
const limit = ref(20);
const totalPages = computed(() => Math.ceil(total.value / limit.value));

// Filters
const searchInput = ref('');
const statusFilter = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

const statusOptions = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'pending', label: 'Pending' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'error', label: 'Error' },
];

async function fetchAssets() {
  loading.value = true;
  error.value = null;

  try {
    const response = await adminApi.getUploadMonitoring({
      page: page.value,
      limit: limit.value,
      search: searchInput.value || undefined,
      status: statusFilter.value || undefined,
    });

    assets.value = response.data.data;
    total.value = response.data.pagination?.total ?? response.data.data.length;
  } catch (_err) {
    error.value = 'Upload verileri yüklenemedi.';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAssets);

watch([searchInput, statusFilter], () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    fetchAssets();
  }, 300);
});

function goToPage(newPage: number) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
    fetchAssets();
  }
}

function getStatusBadge(status: AdminAssetStatus): string {
  const map: Record<AdminAssetStatus, string> = {
    pending: 'badge-neutral',
    uploaded: 'badge-info',
    processing: 'badge-warning',
    ready: 'badge-success',
    error: 'badge-error',
  };
  return map[status] || 'badge-neutral';
}

function getStatusLabel(status: AdminAssetStatus): string {
  const map: Record<AdminAssetStatus, string> = {
    pending: 'Pending',
    uploaded: 'Uploaded',
    processing: 'Processing',
    ready: 'Ready',
    error: 'Error',
  };
  return map[status] || status;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}
</script>

<template>
  <!-- Info note -->
  <div class="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
    <strong>Not:</strong> "uploaded" durumu uygulama akışındaki onaylanmış yüklemeyi ifade eder; doğrudan storage varlık doğrulaması yapılmaz.
  </div>

  <!-- Toolbar -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <!-- Search -->
      <div class="relative flex-1 sm:w-64">
        <input
          v-model="searchInput"
          type="search"
          placeholder="Object key, dataset veya owner ara..."
          class="input pl-10"
          aria-label="Upload ara"
        />
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <!-- Status Filter -->
      <BaseSelect
        id="upload-status-filter"
        v-model="statusFilter"
        :options="statusOptions"
        class="sm:w-40"
        aria-label="Durum filtrele"
      />
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-500 dark:text-gray-400">{{ total }} asset</span>
      <BaseButton variant="secondary" @click="fetchAssets">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Yenile
      </BaseButton>
    </div>
  </div>

  <!-- Loading -->
  <div v-if="loading && assets.length === 0" class="space-y-2">
    <div v-for="i in 6" :key="i" class="card py-3">
      <div class="flex justify-between items-center">
        <BaseSkeleton variant="text" class="w-1/3" />
        <BaseSkeleton variant="rectangular" class="w-20 h-6" />
      </div>
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="card text-center py-12">
    <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
    <BaseButton variant="secondary" @click="fetchAssets">Tekrar Dene</BaseButton>
  </div>

  <!-- Empty -->
  <BaseEmptyState
    v-else-if="assets.length === 0"
    :icon="searchInput || statusFilter ? 'search' : 'database'"
    :title="searchInput || statusFilter ? 'Sonuç bulunamadı' : 'Henüz asset yok'"
    description="Arama kriterlerinizi değiştirin."
  />

  <!-- Table -->
  <div v-else class="card overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead>
        <tr>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Object Key</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dataset</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Owner</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tür / Boyut</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Durum</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tarih</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
        <tr v-for="asset in assets" :key="asset.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
          <td class="px-4 py-3 max-w-[200px]">
            <span
              class="text-sm text-gray-900 dark:text-white font-mono block truncate"
              :title="asset.objectKey"
            >
              {{ truncate(asset.objectKey, 40) }}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="text-sm text-gray-900 dark:text-white">{{ asset.dataset.name }}</span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <div>
              <div class="text-sm text-gray-900 dark:text-white">
                {{ asset.dataset.owner.displayName || '—' }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ asset.dataset.owner.email }}</div>
            </div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="text-sm text-gray-600 dark:text-gray-300">{{ asset.mimeType }}</div>
            <div class="text-xs text-gray-400">{{ formatBytes(asset.sizeBytes) }}</div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span :class="getStatusBadge(asset.status)">{{ getStatusLabel(asset.status) }}</span>
            <p
              v-if="asset.status === 'error' && asset.processingError"
              class="text-xs text-red-600 dark:text-red-400 mt-1 max-w-[200px] truncate"
              :title="asset.processingError"
            >
              {{ asset.processingError }}
            </p>
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(asset.createdAt) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <BasePagination
    :current-page="page"
    :total-pages="totalPages"
    :loading="loading"
    class="mt-6"
    @page-change="goToPage"
  />
</template>
