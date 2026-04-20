<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { adminApi, type AdminReviewListParams } from '@/api/admin';
import type { AdminReviewItem } from '@/types/admin';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/types/api';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import BaseModal from '@/components/ui/BaseModal.vue';

const toastStore = useToastStore();

const reviews = ref<AdminReviewItem[]>([]);
const isLoading = ref(true);

const currentPage = ref(1);
const totalPages = ref(1);
const limit = ref(20);

const taskIdFilter = ref('');
const decisionFilter = ref('');
const decisionOptions = [
  { value: '', label: 'All Decisions' },
  { value: 'accept', label: 'Accept' },
  { value: 'reject', label: 'Reject' },
];

const isResolveModalOpen = ref(false);
const selectedReview = ref<AdminReviewItem | null>(null);
const resolveDecision = ref('accept');
const resolveNotes = ref('');

async function fetchReviews() {
  isLoading.value = true;
  try {
    const params: AdminReviewListParams = { page: currentPage.value, limit: limit.value };
    if (decisionFilter.value) params.decision = decisionFilter.value;
    if (taskIdFilter.value) params.taskId = taskIdFilter.value;
    
    const response = await adminApi.getReviews(params);
    reviews.value = response.data.data;
    if (response.data.pagination) {
      totalPages.value = response.data.pagination.totalPages;
    }
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    toastStore.error('İncelemeler yüklenirken hata oluştu');
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchReviews();
});

watch([currentPage, decisionFilter], () => {
  if (currentPage.value === 1 || decisionFilter.value) {
    if (decisionFilter.value && currentPage.value !== 1) {
      currentPage.value = 1;
    } else {
      fetchReviews();
    }
  } else {
    fetchReviews();
  }
});

function handleFilter() {
  currentPage.value = 1;
  fetchReviews();
}

function openResolveModal(review: AdminReviewItem) {
  selectedReview.value = review;
  resolveDecision.value = review.decision;
  resolveNotes.value = review.notes || '';
  isResolveModalOpen.value = true;
}

async function submitResolve() {
  if (!selectedReview.value) return;
  try {
    await adminApi.resolveReview(selectedReview.value.id, {
      decision: resolveDecision.value,
      notes: resolveNotes.value,
    });
    toastStore.success('Review başarıyla güncellendi/çözümlendi');
    isResolveModalOpen.value = false;
    fetchReviews();
  } catch (error) {
    toastStore.error(getErrorMessage(error, 'Review güncellenemedi'));
  }
}

function getDecisionBadgeClass(decision: string) {
  return decision === 'accept' ? 'badge-success' : 'badge-error';
}

function truncate(str: string | undefined | null, len: number = 8) {
  if (!str) return '-';
  return str.length > len ? str.substring(0, len) + '...' : str;
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Reviews Log</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Oluşturulan inceleme (review) kayıtlarını izleyin veya güncelleyin.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <BaseInput
          id="task-id-filter"
          v-model="taskIdFilter"
          placeholder="Task ID Filtresi"
          class="w-48 bg-white"
          @keyup.enter="handleFilter"
        />
        <BaseSelect
          id="decision-filter"
          v-model="decisionFilter"
          :options="decisionOptions"
          class="w-40 bg-white"
        />
        <BaseButton variant="secondary" @click="handleFilter">
          Filtrele
        </BaseButton>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div v-if="isLoading" class="p-6 space-y-4">
        <BaseSkeleton v-for="i in 5" :key="i" class="h-12 w-full rounded" />
      </div>

      <template v-else-if="reviews.length > 0">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review ID</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Info</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reviewer</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Decision / Notes</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="review in reviews" :key="review.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-300" :title="review.id">
                    {{ truncate(review.id, 8) }}
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900 dark:text-gray-200">
                    T: {{ truncate(review.taskId, 8) }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Status: {{ review.task?.status || '-' }}
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div class="text-gray-900 dark:text-gray-200">
                    {{ review.reviewer?.email || truncate(review.reviewerUserId) }}
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="['px-2.5 py-1 text-xs font-medium rounded-full border', getDecisionBadgeClass(review.decision)]">
                    {{ review.decision }}
                  </span>
                  <div v-if="review.notes" class="text-xs text-gray-500 truncate max-w-[150px] mt-1" :title="review.notes">
                    {{ review.notes }}
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                  {{ new Date(review.createdAt).toLocaleDateString('tr-TR') }}
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex gap-3 justify-end items-center">
                    <button
                      class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      @click="openResolveModal(review)"
                    >
                      Resolve / Update
                    </button>
                    <!-- Admin'in bu linkleri de eklemesi yararlı olabilir -->
                    <!-- <RouterLink :to="`/admin/tasks?contractId=${review.taskId}`" ...> View Task </RouterLink> -->
                  </div>
                </td>

              </tr>
            </tbody>
          </table>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <BasePagination
            :current-page="currentPage"
            :total-pages="totalPages"
            @page-change="page => currentPage = page"
          />
        </div>
      </template>

      <div v-else class="p-12">
        <BaseEmptyState
          title="Review bulunamadı"
          description="Arama kriterlerinize uygun review kaydı yok."
          icon="document"
        />
      </div>
    </div>

    <!-- Resolve Modal -->
    <BaseModal
      :open="isResolveModalOpen"
      title="Resolve Review"
      @close="isResolveModalOpen = false"
    >
      <div v-if="selectedReview" class="space-y-4 px-6 py-4">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          ReviewID: {{ selectedReview.id }}<br/>
          TaskID: {{ selectedReview.taskId }}
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Karar</label>
          <BaseSelect id="resolve-decision" v-model="resolveDecision" :options="decisionOptions.slice(1)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notlar</label>
          <textarea
            v-model="resolveNotes"
            class="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows="3"
            placeholder="Review açıklaması"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <div class="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
          <BaseButton variant="secondary" @click="isResolveModalOpen = false">İptal</BaseButton>
          <BaseButton variant="primary" @click="submitResolve">Kaydet</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
