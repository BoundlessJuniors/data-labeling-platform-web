<script setup lang="ts">
/**
 * AdminDashboardPage - Admin overview with platform statistics
 */
import { ref, onMounted } from 'vue';
import { useSeo } from '@/composables/useSeo';
import apiClient from '@/api/client';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BaseButton from '@/components/ui/BaseButton.vue';

useSeo({
  title: 'Admin Dashboard',
  description: 'Platform istatistikleri ve genel bakış.',
});

interface Stats {
  totalUsers: number;
  totalClients: number;
  totalLabelers: number;
  totalDatasets: number;
  totalAssets: number;
  totalListings: number;
  totalContracts: number;
  totalTasks: number;
  pendingReviews: number;
}

const stats = ref<Stats | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function fetchStats() {
  loading.value = true;
  error.value = null;

  try {
    const response = await apiClient.get('/admin/stats');
    stats.value = response.data.data;
  } catch (_err) {
    error.value = 'İstatistikler yüklenemedi';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchStats);

const statCards = [
  { key: 'totalUsers', label: 'Toplam Kullanıcı', icon: 'users' },
  { key: 'totalClients', label: 'Client', icon: 'briefcase' },
  { key: 'totalLabelers', label: 'Labeler', icon: 'user' },
  { key: 'totalDatasets', label: 'Dataset', icon: 'database' },
  { key: 'totalAssets', label: 'Asset', icon: 'image' },
  { key: 'totalListings', label: 'İlan', icon: 'list' },
  { key: 'totalContracts', label: 'Sözleşme', icon: 'file' },
  { key: 'totalTasks', label: 'Görev', icon: 'check-square' },
];
</script>

<template>
  <AppLayout>
    <template #header>Admin Dashboard</template>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="card">
        <BaseSkeleton variant="text" class="w-1/2 mb-2" />
        <BaseSkeleton variant="text" class="w-1/3 h-8" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
      <BaseButton variant="secondary" @click="fetchStats">Tekrar Dene</BaseButton>
    </div>

    <!-- Stats Grid -->
    <div v-else-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="card in statCards"
        :key="card.key"
        class="card"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ card.label }}</p>
        <p class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ (stats as Record<string, number>)[card.key]?.toLocaleString('tr-TR') ?? 0 }}
        </p>
      </div>
    </div>

    <!-- Pending Reviews Alert -->
    <div v-if="stats && stats.pendingReviews > 0" class="mt-6">
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p class="font-medium text-yellow-800 dark:text-yellow-300">
              {{ stats.pendingReviews }} görev inceleme bekliyor
            </p>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
