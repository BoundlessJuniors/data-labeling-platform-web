<script setup lang="ts">
/**
 * AdminDashboardPage - Admin overview with platform statistics
 * Rendered inside AdminLayout — no AppLayout wrapper.
 */
import { ref, onMounted } from 'vue';
import { useSeo } from '@/composables/useSeo';
import { adminApi } from '@/api/admin';
import type { AdminDashboardStats } from '@/types/admin';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BaseButton from '@/components/ui/BaseButton.vue';

useSeo({
  title: 'Admin Dashboard',
  description: 'Platform istatistikleri ve genel bakış.',
});

const stats = ref<AdminDashboardStats | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function fetchStats() {
  loading.value = true;
  error.value = null;

  try {
    const response = await adminApi.getDashboardStats();
    stats.value = response.data.data;
  } catch (_err) {
    error.value = 'İstatistikler yüklenemedi';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchStats);

// Primary stat cards — entity totals
const primaryCards = [
  { key: 'totalUsers', label: 'Toplam Kullanıcı', color: 'text-primary-600 dark:text-primary-400' },
  { key: 'totalClients', label: 'Client', color: 'text-blue-600 dark:text-blue-400' },
  { key: 'totalLabelers', label: 'Labeler', color: 'text-green-600 dark:text-green-400' },
  { key: 'totalDatasets', label: 'Dataset', color: 'text-purple-600 dark:text-purple-400' },
  { key: 'totalAssets', label: 'Asset', color: 'text-indigo-600 dark:text-indigo-400' },
  { key: 'totalListings', label: 'İlan', color: 'text-orange-600 dark:text-orange-400' },
  { key: 'totalContracts', label: 'Sözleşme', color: 'text-teal-600 dark:text-teal-400' },
  { key: 'totalTasks', label: 'Görev', color: 'text-rose-600 dark:text-rose-400' },
];

// Operational stat cards — status breakdowns
const operationalCards = [
  { key: 'openListings', label: 'Açık İlan', badgeClass: 'badge-info' },
  { key: 'activeContracts', label: 'Aktif Sözleşme', badgeClass: 'badge-success' },
  { key: 'submittedContracts', label: 'Teslim Edilen Sözleşme', badgeClass: 'badge-warning' },
  { key: 'revisionRequestedContracts', label: 'Revizyon İstenen', badgeClass: 'badge-error' },
  { key: 'pendingAssets', label: 'Bekleyen Asset', badgeClass: 'badge-neutral' },
  { key: 'uploadedAssets', label: 'Yüklenen Asset', badgeClass: 'badge-info' },
  { key: 'processingAssets', label: 'İşlenen Asset', badgeClass: 'badge-warning' },
  { key: 'errorAssets', label: 'Hatalı Asset', badgeClass: 'badge-error' },
  { key: 'readyTasks', label: 'Hazır Görev', badgeClass: 'badge-success' },
  { key: 'leasedTasks', label: 'Kiralanmış Görev', badgeClass: 'badge-info' },
  { key: 'submittedTasks', label: 'Teslim Edilen Görev', badgeClass: 'badge-warning' },
  { key: 'rejectedTasks', label: 'Reddedilen Görev', badgeClass: 'badge-error' },
  { key: 'failedSubmissions', label: 'Başarısız Gönderim', badgeClass: 'badge-error' },
  { key: 'processingSubmissions', label: 'İşlenen Gönderim', badgeClass: 'badge-warning' },
];

function getStatValue(key: string): number {
  if (!stats.value) return 0;
  return (stats.value as Record<string, number>)[key] ?? 0;
}
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="space-y-6">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="card">
        <BaseSkeleton variant="text" class="w-1/2 mb-2" />
        <BaseSkeleton variant="text" class="w-1/3 h-8" />
      </div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      <div v-for="i in 10" :key="'op-' + i" class="card py-4">
        <BaseSkeleton variant="text" class="w-2/3 mb-1" />
        <BaseSkeleton variant="text" class="w-1/4 h-6" />
      </div>
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="card text-center py-12">
    <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
    <BaseButton variant="secondary" @click="fetchStats">Tekrar Dene</BaseButton>
  </div>

  <!-- Stats -->
  <div v-else-if="stats" class="space-y-6">
    <!-- Primary stats -->
    <div>
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Genel Bakış
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="card in primaryCards"
          :key="card.key"
          class="card"
        >
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ card.label }}</p>
          <p :class="['text-3xl font-bold', card.color]">
            {{ getStatValue(card.key).toLocaleString('tr-TR') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Operational stats -->
    <div>
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Operasyonel Durum
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div
          v-for="card in operationalCards"
          :key="card.key"
          class="card py-4"
        >
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{{ card.label }}</p>
          <div class="flex items-center gap-2">
            <span class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ getStatValue(card.key).toLocaleString('tr-TR') }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- No data fallback -->
  <div v-else class="card text-center py-12">
    <p class="text-gray-500 dark:text-gray-400">Henüz veri yok.</p>
  </div>
</template>
