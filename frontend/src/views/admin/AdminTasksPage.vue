<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminApi, type AdminTaskListParams } from '@/api/admin';
import type { AdminTaskListItem } from '@/types/admin';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/types/api';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import AdminTaskQcModal from '@/components/admin/AdminTaskQcModal.vue';

const toastStore = useToastStore();
const route = useRoute();
const router = useRouter();

const tasks = ref<AdminTaskListItem[]>([]);
const isLoading = ref(true);

const currentPage = ref(1);
const totalPages = ref(1);
const limit = ref(20);

const contractIdFilter = ref('');
const statusFilter = ref('');
const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ready', label: 'Ready' },
  { value: 'leased', label: 'Leased' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const isQcModalOpen = ref(false);
const selectedTaskId = ref<string | null>(null);

// Modals
const isConfirmModalOpen = ref(false);
const confirmAction = ref<'accept' | 'reject' | 'release' | null>(null);
const activeTaskId = ref<string>('');
const rejectReason = ref<string>('');
const modalLoading = ref(false);

async function fetchTasks() {
  isLoading.value = true;
  try {
    const params: AdminTaskListParams = { 
      page: currentPage.value, 
      limit: limit.value 
    };
    if (statusFilter.value) params.status = statusFilter.value;
    if (contractIdFilter.value) params.contractId = contractIdFilter.value;
    
    const response = await adminApi.getTasks(params);
    tasks.value = response.data.data;
    
    // pagination might be undefined, fallback safely
    const pagination = response.data.pagination;
    totalPages.value = pagination?.totalPages ?? 1;
    currentPage.value = pagination?.page ?? currentPage.value;
  } catch (error: unknown) {
    console.error('Failed to fetch tasks:', error);
    toastStore.error(getErrorMessage(error, 'Görevler yüklenirken hata oluştu'));
  } finally {
    isLoading.value = false;
  }
}

function updateQueryAndFetch() {
  router.replace({
    query: {
      ...route.query,
      page: currentPage.value > 1 ? currentPage.value : undefined,
      status: statusFilter.value || undefined,
      contractId: contractIdFilter.value || undefined,
    }
  }).catch(() => {});
  fetchTasks();
}

onMounted(() => {
  if (route.query.page) currentPage.value = Number(route.query.page);
  if (route.query.status) statusFilter.value = String(route.query.status);
  if (route.query.contractId) contractIdFilter.value = String(route.query.contractId);
  fetchTasks();
});

watch([statusFilter, contractIdFilter], (newVals, oldVals) => {
  if (newVals[0] !== oldVals[0] || newVals[1] !== oldVals[1]) {
    currentPage.value = 1;
    updateQueryAndFetch();
  }
});

watch(currentPage, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    updateQueryAndFetch();
  }
});

function handleFilter() {
  if (currentPage.value !== 1) {
    currentPage.value = 1;
    updateQueryAndFetch();
  } else {
    updateQueryAndFetch();
  }
}

function promptReleaseLeases() {
  confirmAction.value = 'release';
  isConfirmModalOpen.value = true;
}

function promptAccept(id: string) {
  activeTaskId.value = id;
  confirmAction.value = 'accept';
  isConfirmModalOpen.value = true;
}

function promptReject(id: string) {
  activeTaskId.value = id;
  rejectReason.value = '';
  confirmAction.value = 'reject';
  isConfirmModalOpen.value = true;
}

async function executeConfirmAction() {
  modalLoading.value = true;
  try {
    if (confirmAction.value === 'release') {
      const res = await adminApi.releaseExpiredLeases();
      const released = res.data.data?.releasedCount || 0;
      const stale = res.data.data?.staleDeletedCount || 0;
      let msg = `Başarılı: ${released} lease serbest bırakıldı.`;
      if (stale > 0) msg += ` (${stale} stale lease silindi)`;
      toastStore.success(msg);
    } else if (confirmAction.value === 'accept') {
      await adminApi.acceptTask(activeTaskId.value);
      toastStore.success('Görev onaylandı');
    } else if (confirmAction.value === 'reject') {
      const trimmedReason = rejectReason.value.trim();
      if (trimmedReason === '') {
        toastStore.warning('Reddetme nedeni boş olamaz');
        modalLoading.value = false;
        return;
      }
      await adminApi.rejectTask(activeTaskId.value, trimmedReason);
      toastStore.warning('Görev reddedildi');
    }
    fetchTasks();
    isConfirmModalOpen.value = false;
  } catch (error: unknown) {
    toastStore.error(getErrorMessage(error, 'İşlem başarısız'));
  } finally {
    modalLoading.value = false;
  }
}

function openQcView(id: string) {
  selectedTaskId.value = id;
  isQcModalOpen.value = true;
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'ready': return 'badge-neutral';
    case 'leased': return 'badge-neutral bg-blue-100 text-blue-800 border-blue-200';
    case 'submitted': return 'badge-neutral bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'accepted': return 'badge-success';
    case 'rejected': return 'badge-error';
    default: return 'badge-neutral';
  }
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
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Tasks Operations</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Görevlerin yönetimini ve bireysel QC işlemlerini gerçekleştirin.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <BaseInput
          id="admin-tasks-contract-id-filter"
          v-model="contractIdFilter"
          placeholder="Contract ID Filtresi"
          class="w-48 bg-white"
          @keyup.enter="handleFilter"
        />
        <BaseSelect
          id="admin-tasks-status-filter"
          v-model="statusFilter"
          :options="statusOptions"
          class="w-40 bg-white"
        />
        <BaseButton variant="secondary" @click="handleFilter">
          Filtrele
        </BaseButton>
        <BaseButton
          variant="primary"
          @click="promptReleaseLeases"
        >
          Release Expired
        </BaseButton>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div v-if="isLoading" class="p-6 space-y-4">
        <BaseSkeleton v-for="i in 5" :key="i" class="h-12 w-full rounded" />
      </div>

      <template v-else-if="tasks.length > 0">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task / Contract</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metrics</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease & Dates</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="task in tasks" :key="task.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900 dark:text-white" :title="task.id">
                    T: {{ truncate(task.id, 8) }}
                  </div>
                  <div class="text-xs text-gray-500" :title="task.contractId">
                    C: {{ truncate(task.contractId, 8) }}
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="['px-2.5 py-1 text-xs font-medium rounded-full border', getStatusBadgeClass(task.status)]">
                    {{ task.status }}
                  </span>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>Att: {{ task.attemptCount }}</div>
                  <div>Ann: {{ task.annotationCount }}</div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                  <div v-if="task.taskLease" class="text-blue-600 dark:text-blue-400">
                    <div>L: {{ truncate(task.taskLease.labelerUserId, 8) }}</div>
                    <div>Until: {{ new Date(task.taskLease.leasedUntil).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}) }}</div>
                  </div>
                  <div v-else-if="task.lastLeasedAt">
                    Last: {{ new Date(task.lastLeasedAt).toLocaleDateString('tr-TR') }}
                  </div>
                  <div v-else>-</div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex gap-3 justify-end items-center">
                    <button
                      class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      @click="openQcView(task.id)"
                    >
                      QC View
                    </button>
                    <!-- Only show Accept/Reject if submitted -->
                    <template v-if="task.status === 'submitted'">
                      <button
                        class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        @click="promptAccept(task.id)"
                      >
                        Accept
                      </button>
                      <button
                        class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        @click="promptReject(task.id)"
                      >
                        Reject
                      </button>
                    </template>
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
            :loading="isLoading"
            @page-change="currentPage = $event"
          />
        </div>
      </template>

      <div v-else class="p-12">
        <BaseEmptyState
          title="Görev bulunamadı"
          description="Arama kriterlerinize uygun task kaydı yok."
          icon="document"
        />
      </div>
    </div>

    <!-- QC Modal -->
    <AdminTaskQcModal v-model="isQcModalOpen" :task-id="selectedTaskId" />

    <!-- Confirm Modal -->
    <BaseModal
      :open="isConfirmModalOpen"
      :title="confirmAction === 'accept' ? 'Görevi Kabul Et' : confirmAction === 'reject' ? 'Görevi Reddet' : 'Leaseleri Temizle'"
      size="sm"
      @close="isConfirmModalOpen = false"
    >
      <div class="space-y-4">
        <p v-if="confirmAction === 'accept'" class="text-sm text-gray-600 dark:text-gray-300">
          Bu görevi onaylamak istediğinize emin misiniz?
        </p>
        <p v-if="confirmAction === 'release'" class="text-sm text-gray-600 dark:text-gray-300">
          Süresi dolmuş tüm görev kiralamalarını serbest bırakmak istiyor musunuz?
        </p>
        <div v-if="confirmAction === 'reject'">
          <BaseInput
            id="reject-reason"
            v-model="rejectReason"
            label="Reddetme Nedeni"
            placeholder="Neden reddediliyor..."
          />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="outline" @click="isConfirmModalOpen = false">İptal</BaseButton>
        <BaseButton
          :variant="confirmAction === 'reject' ? 'danger' : 'primary'"
          :loading="modalLoading"
          @click="executeConfirmAction"
        >
          Onayla
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
