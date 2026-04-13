<script setup lang="ts">
/**
 * ContractQcPreviewModal - Modal for QC preview of sample tasks.
 * Shows annotated images for random sample tasks from a submitted contract.
 */
import { ref, computed, watch } from 'vue';
import { useContractsStore } from '@/stores/contracts';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import QcImageCanvas from './QcImageCanvas.vue';

const contractsStore = useContractsStore();

const currentIndex = ref(0);

// Reset index when modal opens
watch(() => contractsStore.qcPreviewOpen, (isOpen) => {
  if (isOpen) {
    currentIndex.value = 0;
  }
});

const sampleTasks = computed(() => contractsStore.qcSample?.tasks ?? []);
const totalTasks = computed(() => contractsStore.qcSample?.totalTasks ?? 0);
const sampleSize = computed(() => sampleTasks.value.length);

const currentTask = computed(() => {
  if (sampleTasks.value.length === 0) return null;
  return sampleTasks.value[currentIndex.value] ?? null;
});

const currentTaskView = computed(() => {
  if (!currentTask.value) return null;
  return contractsStore.qcTaskViews.get(currentTask.value.id) ?? null;
});

const hasPrev = computed(() => currentIndex.value > 0);
const hasNext = computed(() => currentIndex.value < sampleTasks.value.length - 1);

function goToPrev() {
  if (hasPrev.value) currentIndex.value--;
}

function goToNext() {
  if (hasNext.value) currentIndex.value++;
}

function handleClose() {
  contractsStore.closeQcPreview();
}

function formatDimensions(width: number | null, height: number | null): string {
  if (width && height) return `${width}×${height}`;
  return 'Bilinmiyor';
}
</script>

<template>
  <BaseModal
    :open="contractsStore.qcPreviewOpen"
    title="QC Önizleme"
    size="xl"
    @close="handleClose"
  >
    <!-- Loading -->
    <div v-if="contractsStore.qcLoading" class="flex flex-col items-center py-12">
      <svg
        class="animate-spin h-8 w-8 text-primary-600 mb-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Örnekler yükleniyor…</p>
    </div>

    <!-- Error -->
    <div v-else-if="contractsStore.qcError" class="text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ contractsStore.qcError }}</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="sampleSize === 0" class="text-center py-12">
      <svg class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
      <p class="text-gray-500 dark:text-gray-400">Bu sözleşmede gösterilecek örnek bulunamadı.</p>
    </div>

    <!-- Sample preview content -->
    <template v-else>
      <!-- Header info bar -->
      <div class="flex items-center justify-between mb-4 px-1">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Toplam <strong class="text-gray-700 dark:text-gray-200">{{ totalTasks }}</strong> görevden
          <strong class="text-gray-700 dark:text-gray-200">{{ sampleSize }}</strong> örnek
        </div>
        <div class="text-sm font-medium text-gray-700 dark:text-gray-200">
          {{ currentIndex + 1 }} / {{ sampleSize }}
        </div>
      </div>

      <!-- Navigation + Image area -->
      <div class="flex items-center gap-3">
        <!-- Prev button -->
        <button
          type="button"
          :disabled="!hasPrev"
          class="qc-nav-btn"
          aria-label="Önceki örnek"
          @click="goToPrev"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- Canvas area -->
        <div class="flex-1 min-w-0">
          <QcImageCanvas
            v-if="currentTaskView"
            :key="currentTask?.id"
            :task-view="currentTaskView"
          />
          <div v-else class="text-center py-8">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Bu örneğin detayları yüklenemedi.
            </p>
          </div>
        </div>

        <!-- Next button -->
        <button
          type="button"
          :disabled="!hasNext"
          class="qc-nav-btn"
          aria-label="Sonraki örnek"
          @click="goToNext"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Task metadata -->
      <div v-if="currentTask" class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div class="qc-meta-card">
          <span class="qc-meta-label">Task ID</span>
          <span class="qc-meta-value font-mono">{{ currentTask.id.slice(0, 8) }}…</span>
        </div>
        <div class="qc-meta-card">
          <span class="qc-meta-label">Durum</span>
          <span class="qc-meta-value">{{ currentTask.status }}</span>
        </div>
        <div class="qc-meta-card">
          <span class="qc-meta-label">Boyut</span>
          <span class="qc-meta-value">{{ formatDimensions(currentTask.asset?.width, currentTask.asset?.height) }}</span>
        </div>
        <div class="qc-meta-card">
          <span class="qc-meta-label">Tür</span>
          <span class="qc-meta-value">{{ currentTask.asset?.mimeType ?? 'Bilinmiyor' }}</span>
        </div>
      </div>

      <!-- Sample dot indicators -->
      <div class="flex justify-center mt-4 gap-1.5">
        <button
          v-for="(_, idx) in sampleTasks"
          :key="idx"
          type="button"
          class="w-2.5 h-2.5 rounded-full transition-all duration-200"
          :class="idx === currentIndex
            ? 'bg-primary-600 scale-110'
            : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'"
          :aria-label="`Örnek ${idx + 1}`"
          @click="currentIndex = idx"
        />
      </div>
    </template>

    <template #footer>
      <BaseButton variant="secondary" @click="handleClose">
        Kapat
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.qc-nav-btn {
  @apply flex-shrink-0 p-2 rounded-full transition-colors duration-200;
  @apply text-gray-400 hover:text-gray-600 hover:bg-gray-100;
  @apply dark:hover:text-gray-200 dark:hover:bg-gray-700;
  @apply disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent;
}

.qc-meta-card {
  @apply flex flex-col gap-0.5 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50;
}

.qc-meta-label {
  @apply text-gray-500 dark:text-gray-400 uppercase tracking-wide;
  font-size: 0.65rem;
}

.qc-meta-value {
  @apply text-gray-800 dark:text-gray-200 font-medium;
}
</style>
