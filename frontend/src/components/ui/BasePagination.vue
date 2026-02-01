<script setup lang="ts">
/**
 * Pagination Component
 */
defineProps<{
  currentPage: number;
  totalPages: number;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'page-change', page: number): void;
}>();

function goToPage(page: number) {
  emit('page-change', page);
}
</script>

<template>
  <nav
    v-if="totalPages > 1"
    class="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6"
    aria-label="Sayfalama"
  >
    <div class="hidden sm:block">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        Sayfa <span class="font-medium">{{ currentPage }}</span> / <span class="font-medium">{{ totalPages }}</span>
      </p>
    </div>

    <div class="flex flex-1 justify-between sm:justify-end gap-2">
      <button
        type="button"
        :disabled="currentPage <= 1 || loading"
        class="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="goToPage(currentPage - 1)"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Önceki
      </button>

      <button
        type="button"
        :disabled="currentPage >= totalPages || loading"
        class="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="goToPage(currentPage + 1)"
      >
        Sonraki
        <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </nav>
</template>
