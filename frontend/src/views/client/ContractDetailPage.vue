<script setup lang="ts">
/**
 * ContractDetailPage - View contract tasks with QC panel
 */
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useContractsStore } from '@/stores/contracts';
import { useTasksStore } from '@/stores/tasks';
import { useSeo } from '@/composables/useSeo';
import type { QCDecision } from '@/types/task';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';

const route = useRoute();
const router = useRouter();
const contractsStore = useContractsStore();
const tasksStore = useTasksStore();

const contractId = computed(() => route.params.id as string);

useSeo({
  title: 'Sözleşme Detay',
  description: 'Sözleşme görevlerini inceleyin ve onaylayın.',
});

// QC Modal state
const showQCModal = ref(false);
const selectedTaskId = ref<string | null>(null);
const selectedDecision = ref<QCDecision>('approved');
const reviewComment = ref('');

onMounted(async () => {
  if (contractId.value) {
    await contractsStore.fetchContract(contractId.value);
    await tasksStore.fetchTasks(contractId.value);
  }
});

function openQCModal(taskId: string) {
  selectedTaskId.value = taskId;
  selectedDecision.value = 'approved';
  reviewComment.value = '';
  showQCModal.value = true;
}

async function submitReview() {
  if (!selectedTaskId.value) return;
  const result = await tasksStore.createReview(
    selectedTaskId.value,
    selectedDecision.value,
    reviewComment.value || undefined
  );
  if (result) {
    showQCModal.value = false;
    selectedTaskId.value = null;
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
    revision_requested: 'Revizyon İstendi',
    resubmitted: 'Yeniden Gönderildi',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
  };
  return labels[status] || status;
}

function goBack() {
  router.push({ name: 'client-contracts' });
}
</script>

<template>
  <AppLayout>
    <template #header>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Geri"
          @click="goBack"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span>Sözleşme Görevleri</span>
      </div>
    </template>

    <!-- Contract Info -->
    <div v-if="contractsStore.currentContract" class="card mb-6">
      <div class="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ contractsStore.currentContract.listing?.title || 'İlan' }}
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Labeler: {{ contractsStore.currentContract.labeler?.displayName || contractsStore.currentContract.labeler?.email }}
          </p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ contractsStore.currentContract.completedAssets }} / {{ contractsStore.currentContract.assignedAssets }}
          </div>
          <div class="text-sm text-gray-500">Tamamlanan</div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="tasksStore.loading && tasksStore.tasks.length === 0" class="space-y-2">
      <div v-for="i in 8" :key="i" class="card py-3">
        <div class="flex justify-between items-center">
          <BaseSkeleton variant="text" class="w-1/3" />
          <BaseSkeleton variant="rectangular" class="w-20 h-6" />
        </div>
      </div>
    </div>

    <!-- Empty -->
    <BaseEmptyState
      v-else-if="tasksStore.tasks.length === 0 && !tasksStore.loading"
      icon="database"
      title="Henüz görev yok"
      description="Bu sözleşmede henüz görev oluşturulmamış."
    />

    <!-- Tasks List -->
    <div v-else class="space-y-2">
      <div
        v-for="task in tasksStore.tasks"
        :key="task.id"
        class="card py-3 hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-sm font-mono text-gray-500 dark:text-gray-400">
              #{{ task.id.slice(-6) }}
            </span>
            <span :class="getStatusBadge(task.status)">{{ getStatusLabel(task.status) }}</span>
          </div>
          <div class="flex gap-2">
            <button
              v-if="['submitted', 'resubmitted'].includes(task.status)"
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-300 transition-colors"
              @click="openQCModal(task.id)"
            >
              İncele
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <BasePagination
      :current-page="tasksStore.page"
      :total-pages="tasksStore.totalPages"
      :loading="tasksStore.loading"
      class="mt-6"
      @page-change="tasksStore.goToPage"
    />

    <!-- QC Review Modal -->
    <BaseModal :open="showQCModal" title="Görevi İncele" size="md" @close="showQCModal = false">
      <div class="space-y-4">
        <!-- Decision -->
        <fieldset>
          <legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Karar</legend>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="selectedDecision"
                type="radio"
                value="approved"
                class="w-4 h-4 text-green-600"
              />
              <span class="text-sm text-gray-900 dark:text-white">Onayla</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="selectedDecision"
                type="radio"
                value="revision_requested"
                class="w-4 h-4 text-yellow-600"
              />
              <span class="text-sm text-gray-900 dark:text-white">Revizyon İste</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="selectedDecision"
                type="radio"
                value="rejected"
                class="w-4 h-4 text-red-600"
              />
              <span class="text-sm text-gray-900 dark:text-white">Reddet</span>
            </label>
          </div>
        </fieldset>
        <!-- Comment -->
        <div>
          <label for="qc-comment" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Yorum (opsiyonel)
          </label>
          <textarea
            id="qc-comment"
            v-model="reviewComment"
            class="input"
            rows="3"
            placeholder="Geri bildirim yazın..."
          ></textarea>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showQCModal = false">İptal</BaseButton>
        <BaseButton
          :variant="selectedDecision === 'approved' ? 'primary' : selectedDecision === 'rejected' ? 'danger' : 'secondary'"
          :loading="tasksStore.loading"
          @click="submitReview"
        >
          Gönder
        </BaseButton>
      </template>
    </BaseModal>
  </AppLayout>
</template>
