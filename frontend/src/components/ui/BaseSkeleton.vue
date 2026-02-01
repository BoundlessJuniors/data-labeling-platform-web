<script setup lang="ts">
/**
 * BaseSkeleton - Loading placeholder component
 */

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  lines?: number;
}

withDefaults(defineProps<SkeletonProps>(), {
  variant: 'text',
  lines: 1,
});
</script>

<template>
  <div
    v-if="variant === 'text'"
    class="space-y-2"
    role="status"
    aria-label="Loading..."
  >
    <div
      v-for="i in lines"
      :key="i"
      :style="{ width: i === lines ? '75%' : width || '100%', height: height || '1em' }"
      class="bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
    />
    <span class="sr-only">Loading...</span>
  </div>

  <div
    v-else-if="variant === 'circular'"
    :style="{ width: width || '3rem', height: height || '3rem' }"
    class="bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
    role="status"
    aria-label="Loading..."
  >
    <span class="sr-only">Loading...</span>
  </div>

  <div
    v-else
    :style="{ width: width || '100%', height: height || '8rem' }"
    class="bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
    role="status"
    aria-label="Loading..."
  >
    <span class="sr-only">Loading...</span>
  </div>
</template>
