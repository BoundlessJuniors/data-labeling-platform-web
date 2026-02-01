/**
 * Tasks Store - State management for tasks
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { tasksApi } from '@/api/tasks';
import type { Task, TaskWithDetails, QCDecision } from '@/types/task';
import { getErrorMessage } from '@/types/api';
import { useToastStore } from './toast';

export const useTasksStore = defineStore('tasks', () => {
  const toastStore = useToastStore();

  // State
  const tasks = ref<Task[]>([]);
  const currentTask = ref<TaskWithDetails | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentContractId = ref<string | null>(null);

  // Pagination
  const page = ref(1);
  const limit = ref(20);
  const total = ref(0);
  const totalPages = computed(() => Math.ceil(total.value / limit.value));

  /**
   * Fetch paginated tasks for a contract
   */
  async function fetchTasks(contractId: string, newPage?: number) {
    loading.value = true;
    error.value = null;
    currentContractId.value = contractId;

    try {
      const response = await tasksApi.list({
        contractId,
        page: newPage ?? page.value,
        limit: limit.value,
      });

      tasks.value = response.data.data;
      total.value = response.data.pagination?.total ?? response.data.data.length;
      page.value = newPage ?? page.value;

      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Görevler yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch single task by ID
   */
  async function fetchTask(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await tasksApi.get(id);
      currentTask.value = response.data.data;
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Görev yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a review for a task
   */
  async function createReview(taskId: string, decision: QCDecision, comment?: string) {
    loading.value = true;
    try {
      await tasksApi.createReview({ taskId, decision, comment });

      // Update task status in list
      const taskIndex = tasks.value.findIndex((t) => t.id === taskId);
      if (taskIndex > -1) {
        const task = tasks.value[taskIndex];
        if (task) {
          if (decision === 'approved') {
            task.status = 'approved';
          } else if (decision === 'rejected') {
            task.status = 'rejected';
          } else {
            task.status = 'revision_requested';
          }
        }
      }

      const messages: Record<QCDecision, string> = {
        approved: 'Görev onaylandı',
        rejected: 'Görev reddedildi',
        revision_requested: 'Revizyon istendi',
      };
      toastStore.success(messages[decision]);
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'İşlem başarısız'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Go to specific page
   */
  async function goToPage(newPage: number) {
    if (currentContractId.value && newPage >= 1 && newPage <= totalPages.value) {
      return fetchTasks(currentContractId.value, newPage);
    }
    return false;
  }

  /**
   * Reset store state
   */
  function reset() {
    tasks.value = [];
    currentTask.value = null;
    loading.value = false;
    error.value = null;
    currentContractId.value = null;
    page.value = 1;
    total.value = 0;
  }

  return {
    // State
    tasks,
    currentTask,
    loading,
    error,
    currentContractId,
    // Pagination
    page,
    limit,
    total,
    totalPages,
    // Actions
    fetchTasks,
    fetchTask,
    createReview,
    goToPage,
    reset,
  };
});
