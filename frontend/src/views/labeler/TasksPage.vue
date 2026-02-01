<script setup lang="ts">
/**
 * TasksPage - Labeler's tasks with status and QC feedback
 */
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSeo } from '@/composables/useSeo';
import { useToastStore } from '@/stores/toast';
import apiClient from '@/api/client';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import BaseModal from '@/components/ui/BaseModal.vue';

useSeo({
  title: 'Görevlerim',
  description: 'Etiketleme görevlerinizi takip edin.',
});

const route = useRoute();
const toastStore = useToastStore();

interface MyTask {
  id: string;
  contractId: string;
  assetFileName: string;
  assetThumbnailUrl: string | null;
  status: string;
  priority: number;
  qcComment: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

// State
const tasks = ref<MyTask[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref(1);
const total = ref(0);
const limit = ref(20);
const totalPages = computed(() => Math.ceil(total.value / limit.value));

// Filter by contract
const contractId = computed(() => route.query.contractId as string | undefined);

// Detail modal
const showDetailModal = ref(false);
const selectedTask = ref<MyTask | null>(null);

async function fetchTasks() {
  loading.value = true;
  error.value = null;

  try {
    const response = await apiClient.get('/tasks/my', {
      params: {
        page: page.value,
        limit: limit.value,
        contractId: contractId.value || undefined,
      },
    });

    tasks.value = response.data.data;
    total.value = response.data.pagination?.total ?? response.data.data.length;
  } catch (_err) {
    error.value = 'Görevler yüklenemedi';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchTasks);

watch(contractId, () => {
  page.value = 1;
  fetchTasks();
});

function goToPage(newPage: number) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
    fetchTasks();
  }
}

function openDetail(task: MyTask) {
  selectedTask.value = task;
  showDetailModal.value = true;
}

async function startTask(taskId: string) {
  try {
    await apiClient.patch(`/tasks/${taskId}/start`);
    toastStore.success('Görev başlatıldı');
    fetchTasks();
  } catch (_err) {
    toastStore.error('Görev başlatılamadı');
  }
}

function getStatusBadge(status: string) {
  const badges: Record<string, string> = {
    pending: 'badge-neutral',
    assigned: 'badge-neutral',
    in_progress: 'badge-info',
    submitted: 'badge-warning',
    revision_requested: 'badge-warning',
    resubmitted: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-error',
  };
  return badges[status] || 'badge-neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Beklemede',
    assigned: 'Atandı',
    in_progress: 'Devam Ediyor',
    submitted: 'Gönderildi',
    revision_requested: 'Revizyon',
    resubmitted: 'Yeniden Gönderildi',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
  };
  return labels[status] || status;
}
</script>

<template>
  <AppLayout>
    <template #header>Görevlerim</template>

    <!-- Filter info -->
    <div v-if="contractId" class="mb-4">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        Sözleşme filtresi aktif
        <button
          type="button"
          class="ml-2 text-primary-600 hover:text-primary-700"
          @click="$router.push({ name: 'labeler-tasks' })"
        >
          Temizle
        </button>
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading && tasks.length === 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div v-for="i in 12" :key="i" class="aspect-square">
        <BaseSkeleton variant="rectangular" class="w-full h-full rounded-lg" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
      <BaseButton variant="secondary" @click="fetchTasks">Tekrar Dene</BaseButton>
    </div>

    <!-- Empty -->
    <BaseEmptyState
      v-else-if="tasks.length === 0"
      icon="database"
      title="Henüz görev yok"
      description="Sözleşmeler kabul edildiğinde görevleriniz burada görünecektir."
    >
      <template #action>
        <BaseButton variant="primary" @click="$router.push({ name: 'labeler-contracts' })">
          Sözleşmelerime Git
        </BaseButton>
      </template>
    </BaseEmptyState>

    <!-- Tasks Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <button
        v-for="task in tasks"
        :key="task.id"
        type="button"
        class="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 transition-all"
        :class="task.status === 'revision_requested' ? 'border-yellow-500' : 'border-transparent hover:border-primary-500'"
        @click="openDetail(task)"
      >
        <!-- Thumbnail -->
        <img
          v-if="task.assetThumbnailUrl"
          :src="task.assetThumbnailUrl"
          :alt="task.assetFileName"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <!-- Status badge -->
        <div class="absolute top-2 right-2">
          <span :class="getStatusBadge(task.status)" class="text-xs">
            {{ getStatusLabel(task.status) }}
          </span>
        </div>
        <!-- Overlay on hover -->
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <div class="text-white text-xs truncate w-full">
            {{ task.assetFileName }}
          </div>
        </div>
        <!-- Revision indicator -->
        <div v-if="task.qcComment" class="absolute top-2 left-2">
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
        </div>
      </button>
    </div>

    <!-- Pagination -->
    <BasePagination
      :current-page="page"
      :total-pages="totalPages"
      :loading="loading"
      class="mt-6"
      @page-change="goToPage"
    />

    <!-- Task Detail Modal -->
    <BaseModal :open="showDetailModal" :title="selectedTask?.assetFileName ?? 'Görev'" size="lg" @close="showDetailModal = false">
      <div v-if="selectedTask" class="space-y-4">
        <!-- Status -->
        <div class="flex items-center gap-2">
          <span :class="getStatusBadge(selectedTask.status)">{{ getStatusLabel(selectedTask.status) }}</span>
        </div>

        <!-- QC Comment -->
        <div v-if="selectedTask.qcComment" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 class="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">QC Yorumu</h4>
          <p class="text-sm text-yellow-700 dark:text-yellow-400">{{ selectedTask.qcComment }}</p>
        </div>

        <!-- Labeling disabled notice -->
        <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
            Etiketleme işlemi için desktop uygulamasını kullanın.
          </p>
        </div>

        <!-- Action buttons -->
        <div v-if="['assigned', 'pending'].includes(selectedTask.status)" class="flex justify-end">
          <BaseButton variant="primary" @click="startTask(selectedTask.id)">
            Göreve Başla
          </BaseButton>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showDetailModal = false">Kapat</BaseButton>
      </template>
    </BaseModal>
  </AppLayout>
</template>
