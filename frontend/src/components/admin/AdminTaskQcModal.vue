<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { adminApi } from '@/api/admin';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import QcImageCanvas from '@/components/contracts/QcImageCanvas.vue';
import { useToastStore } from '@/stores/toast';
import type { QcTaskView } from '@/types/qc'; // Import the type that QcImageCanvas expects
import { getErrorMessage } from '@/types/api';

const props = defineProps<{
  modelValue: boolean;
  taskId: string | null;
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'closed'): void;
}>();

const toastStore = useToastStore();
const isLoading = ref(false);
const taskViewData = ref<QcTaskView | null>(null);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

watch(
  () => props.taskId,
  async (newId) => {
    if (newId && isOpen.value) {
      await loadTaskView(newId);
    } else {
      taskViewData.value = null;
    }
  }
);

watch(isOpen, async (open) => {
  if (open && props.taskId && !taskViewData.value) {
    await loadTaskView(props.taskId);
  } else if (!open) {
    // delay cleanup to avoid flash
    setTimeout(() => {
      taskViewData.value = null;
    }, 300);
  }
});

async function loadTaskView(id: string) {
  try {
    isLoading.value = true;
    const response = await adminApi.getTaskQcView(id);
    if (response.data?.success && response.data.data) {
      if (!response.data.data.asset) {
        throw new Error('Task asset is missing');
      }

      taskViewData.value = {
        id: response.data.data.id,
        status: response.data.data.status,
        asset: response.data.data.asset,
        imageUrl: response.data.data.imageUrl,
        latestRaw: response.data.data.latestRaw
          ? {
              id: response.data.data.latestRaw.id,
              taskId: response.data.data.latestRaw.taskId,
              labelerUserId: response.data.data.latestRaw.labelerUserId,
              payloadJson: response.data.data.latestRaw.payloadJson,
              createdAt: response.data.data.latestRaw.createdAt,
            }
          : null,
        normalized: response.data.data.normalized
          ? {
              id: response.data.data.normalized.id,
              taskId: response.data.data.normalized.taskId,
              normalizedJson: response.data.data.normalized.normalizedJson,
              version: response.data.data.normalized.version,
            }
          : null,
        normalizeReady: response.data.data.normalizeReady,
        labelSet: response.data.data.labelSet
          ? {
              id: response.data.data.labelSet.id,
              name: response.data.data.labelSet.name,
              version: response.data.data.labelSet.version,
              labels: response.data.data.labelSet.labels.map((label) => ({
                id: label.id,
                name: label.name,
                color: label.color,
                attributesSchemaJson: label.attributesSchemaJson ?? null,
              })),
            }
          : null,
      };
    } else {
      throw new Error('Failed to load task QC view');
    }
  } catch (error: unknown) {
    console.error('Error loading QC view:', error);
    toastStore.error(getErrorMessage(error, 'Error loading QC view'));
    isOpen.value = false;
  } finally {
    isLoading.value = false;
  }
}

function close() {
  isOpen.value = false;
  emit('closed');
}
</script>

<template>
  <BaseModal
    :open="isOpen"
    :title="title || 'Task QC Preview'"
    size="xl"
    @close="close"
  >
    <div class="px-6 py-4">
      <div v-if="isLoading" class="space-y-4">
        <BaseSkeleton class="w-full h-80 rounded-xl" />
        <BaseSkeleton class="w-1/2 h-6" />
      </div>
      
      <div v-else-if="taskViewData">
        <div class="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <QcImageCanvas :task-view="taskViewData" />
        </div>
        
        <div class="mt-4 flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div><span class="font-medium text-gray-900 dark:text-gray-100">Task ID:</span> {{ taskViewData.id }}</div>
          <div><span class="font-medium text-gray-900 dark:text-gray-100">Status:</span> {{ taskViewData.status }}</div>
        </div>
      </div>
      
      <div v-else class="text-center py-12 text-gray-500 dark:text-gray-400">
        Görev verisi yüklenemedi.
      </div>
    </div>
    
    <template #footer>
      <div class="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
        <BaseButton variant="secondary" @click="close">
          Kapat
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
