<script setup lang="ts">
/**
 * QueueMonitoringPage - BullMQ queue status monitoring
 * Shows queue counts and recent jobs.
 * Completed job history may be empty due to removeOnComplete: true.
 * Rendered inside AdminLayout.
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { useSeo } from '@/composables/useSeo';
import { adminApi } from '@/api/admin';
import type { AdminQueueSummary } from '@/types/admin';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';

useSeo({
  title: 'Queue Monitoring',
  description: 'BullMQ kuyruk durumlarını izleyin.',
});

// State
const queues = ref<AdminQueueSummary[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Auto-refresh
const autoRefreshEnabled = ref(false);
let autoRefreshTimer: number | null = null;
const AUTO_REFRESH_INTERVAL = 15000;

async function fetchQueues() {
  loading.value = true;
  error.value = null;

  try {
    const response = await adminApi.getQueueMonitoring({ jobLimit: 10 });
    queues.value = response.data.data.queues;
  } catch (_err) {
    error.value = 'Kuyruk verileri yüklenemedi.';
  } finally {
    loading.value = false;
  }
}

function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value;
  if (autoRefreshEnabled.value) {
    autoRefreshTimer = window.setInterval(fetchQueues, AUTO_REFRESH_INTERVAL);
  } else {
    stopAutoRefresh();
  }
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    window.clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

onMounted(fetchQueues);

onUnmounted(() => {
  stopAutoRefresh();
});

// Helpers
function getStateBadge(state: string): string {
  const map: Record<string, string> = {
    waiting: 'badge-neutral',
    active: 'badge-info',
    delayed: 'badge-warning',
    failed: 'badge-error',
    completed: 'badge-success',
    paused: 'badge-neutral',
  };
  return map[state] || 'badge-neutral';
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function summarizeData(data: Record<string, unknown> | null): string {
  if (!data) return '—';
  try {
    const str = JSON.stringify(data);
    if (str.length > 80) return str.slice(0, 80) + '…';
    return str;
  } catch {
    return '—';
  }
}

function getCountEntries(q: AdminQueueSummary) {
  return [
    { label: 'Waiting', value: q.counts.waiting, cls: 'text-gray-600 dark:text-gray-300' },
    { label: 'Active', value: q.counts.active, cls: 'text-blue-600 dark:text-blue-400' },
    { label: 'Delayed', value: q.counts.delayed, cls: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Failed', value: q.counts.failed, cls: 'text-red-600 dark:text-red-400' },
    { label: 'Completed', value: q.counts.completed, cls: 'text-green-600 dark:text-green-400' },
    { label: 'Paused', value: q.counts.paused, cls: 'text-gray-500 dark:text-gray-400' },
  ];
}
</script>

<template>
  <!-- Toolbar -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
    <div>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        BullMQ kuyruk durumlarını izleyin.
      </p>
    </div>
    <div class="flex items-center gap-3">
      <button
        type="button"
        :class="[
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
          autoRefreshEnabled
            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
            : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300',
        ]"
        @click="toggleAutoRefresh"
      >
        <span :class="['w-2 h-2 rounded-full', autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400']" />
        {{ autoRefreshEnabled ? 'Auto (15s)' : 'Auto Kapalı' }}
      </button>
      <BaseButton variant="secondary" @click="fetchQueues">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Yenile
      </BaseButton>
    </div>
  </div>

  <!-- Info note -->
  <div class="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
    <strong>Not:</strong> Completed işler sistem ayarı nedeniyle otomatik temizlenebilir; bu liste tam geçmişi temsil etmeyebilir.
  </div>

  <!-- Loading -->
  <div v-if="loading && queues.length === 0" class="space-y-6">
    <div v-for="i in 2" :key="i" class="card">
      <BaseSkeleton variant="text" class="w-1/4 mb-4 h-6" />
      <div class="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
        <div v-for="j in 6" :key="j">
          <BaseSkeleton variant="text" class="w-full mb-1" />
          <BaseSkeleton variant="text" class="w-1/2 h-6" />
        </div>
      </div>
      <BaseSkeleton variant="rectangular" class="w-full h-32" />
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="card text-center py-12">
    <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
    <BaseButton variant="secondary" @click="fetchQueues">Tekrar Dene</BaseButton>
  </div>

  <!-- Queue cards -->
  <div v-else class="space-y-6">
    <div v-for="q in queues" :key="q.name" class="card">
      <!-- Queue header -->
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {{ q.name }}
      </h3>

      <!-- Counts grid -->
      <div class="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
        <div
          v-for="entry in getCountEntries(q)"
          :key="entry.label"
          class="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{{ entry.label }}</p>
          <p :class="['text-xl font-bold', entry.cls]">{{ entry.value }}</p>
        </div>
      </div>

      <!-- Recent jobs -->
      <div>
        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Son İşler</h4>

        <div v-if="q.recentJobs.length === 0" class="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
          Bu kuyrukta görüntülenecek iş yok.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead>
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">İsim</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Durum</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Deneme</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Oluşturma</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hata</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Data</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="job in q.recentJobs"
                :key="(job.id ?? '') + job.timestamp"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-white font-mono text-xs">
                  {{ job.id ?? '—' }}
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                  {{ job.name }}
                </td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <span :class="getStateBadge(job.state)">{{ job.state }}</span>
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                  {{ job.attemptsMade }}
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {{ formatTimestamp(job.timestamp) }}
                </td>
                <td class="px-3 py-2 max-w-[200px]">
                  <span
                    v-if="job.failedReason"
                    class="text-red-600 dark:text-red-400 text-xs block truncate"
                    :title="job.failedReason"
                  >
                    {{ job.failedReason }}
                  </span>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="px-3 py-2 max-w-[200px]">
                  <span
                    class="text-xs text-gray-500 dark:text-gray-400 font-mono block truncate"
                    :title="JSON.stringify(job.data)"
                  >
                    {{ summarizeData(job.data) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
