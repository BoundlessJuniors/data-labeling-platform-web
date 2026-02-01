<script setup lang="ts">
import { computed } from 'vue';

/**
 * BaseToast - Toast notification component
 * For use with a toast composable/store
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  type?: ToastType;
  title?: string;
  message: string;
  dismissible?: boolean;
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  dismissible: true,
});

const emit = defineEmits<{
  dismiss: [];
}>();

const iconPath = computed(() => {
  switch (props.type) {
    case 'success':
      return 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z';
    case 'error':
      return 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z';
    case 'warning':
      return 'M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z';
    default:
      return 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z';
  }
});
</script>

<template>
  <div
    :class="[
      'flex items-start gap-3 p-4 rounded-lg shadow-lg border',
      {
        'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800': type === 'success',
        'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800': type === 'error',
        'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800': type === 'warning',
        'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800': type === 'info',
      },
    ]"
    role="alert"
    :aria-live="type === 'error' ? 'assertive' : 'polite'"
  >
    <!-- Icon -->
    <svg
      :class="[
        'h-5 w-5 flex-shrink-0',
        {
          'text-green-500': type === 'success',
          'text-red-500': type === 'error',
          'text-yellow-500': type === 'warning',
          'text-blue-500': type === 'info',
        },
      ]"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path fill-rule="evenodd" :d="iconPath" clip-rule="evenodd" />
    </svg>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p
        v-if="title"
        :class="[
          'font-medium',
          {
            'text-green-800 dark:text-green-200': type === 'success',
            'text-red-800 dark:text-red-200': type === 'error',
            'text-yellow-800 dark:text-yellow-200': type === 'warning',
            'text-blue-800 dark:text-blue-200': type === 'info',
          },
        ]"
      >
        {{ title }}
      </p>
      <p
        :class="[
          'text-sm',
          {
            'text-green-700 dark:text-green-300': type === 'success',
            'text-red-700 dark:text-red-300': type === 'error',
            'text-yellow-700 dark:text-yellow-300': type === 'warning',
            'text-blue-700 dark:text-blue-300': type === 'info',
          },
        ]"
      >
        {{ message }}
      </p>
    </div>

    <!-- Dismiss button -->
    <button
      v-if="dismissible"
      type="button"
      :class="[
        'flex-shrink-0 p-1 rounded-lg focus:outline-none focus:ring-2',
        {
          'text-green-500 hover:bg-green-100 focus:ring-green-500 dark:hover:bg-green-800': type === 'success',
          'text-red-500 hover:bg-red-100 focus:ring-red-500 dark:hover:bg-red-800': type === 'error',
          'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-500 dark:hover:bg-yellow-800': type === 'warning',
          'text-blue-500 hover:bg-blue-100 focus:ring-blue-500 dark:hover:bg-blue-800': type === 'info',
        },
      ]"
      aria-label="Dismiss"
      @click="emit('dismiss')"
    >
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
        />
      </svg>
    </button>
  </div>
</template>
