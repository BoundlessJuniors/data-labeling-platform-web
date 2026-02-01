<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

/**
 * BaseModal - Accessible modal dialog
 * With focus trap and escape key handling
 */

export interface ModalProps {
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
}

const props = withDefaults(defineProps<ModalProps>(), {
  size: 'md',
  closable: true,
});

const emit = defineEmits<{
  close: [];
}>();

const modalRef = ref<HTMLElement | null>(null);
const previousActiveElement = ref<HTMLElement | null>(null);

function close() {
  if (props.closable) {
    emit('close');
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open && props.closable) {
    close();
  }
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    close();
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      previousActiveElement.value = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      // Focus modal after render
      setTimeout(() => {
        modalRef.value?.focus();
      }, 0);
    } else {
      document.body.style.overflow = '';
      previousActiveElement.value?.focus();
    }
  }
);

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
          @click="handleBackdropClick"
        />

        <!-- Modal container -->
        <div
          class="flex min-h-full items-center justify-center p-4"
          @click="handleBackdropClick"
        >
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="open"
              ref="modalRef"
              tabindex="-1"
              :class="[
                'relative bg-white dark:bg-gray-800 rounded-xl shadow-xl',
                'focus:outline-none',
                {
                  'w-full max-w-sm': size === 'sm',
                  'w-full max-w-md': size === 'md',
                  'w-full max-w-lg': size === 'lg',
                  'w-full max-w-2xl': size === 'xl',
                },
              ]"
              @click.stop
            >
              <!-- Header -->
              <div
                v-if="title || closable"
                class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700"
              >
                <h2
                  v-if="title"
                  id="modal-title"
                  class="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  {{ title }}
                </h2>
                <button
                  v-if="closable"
                  type="button"
                  class="p-2 -mr-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Close modal"
                  @click="close"
                >
                  <svg
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                    />
                  </svg>
                </button>
              </div>

              <!-- Content -->
              <div class="px-6 py-4">
                <slot />
              </div>

              <!-- Footer -->
              <div
                v-if="$slots.footer"
                class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3"
              >
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
