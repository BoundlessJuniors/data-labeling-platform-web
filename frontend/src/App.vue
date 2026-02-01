<script setup lang="ts">
/**
 * App.vue - Root component
 * - Initializes session restore on mount
 * - Renders toast container for global notifications
 */
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ToastContainer from '@/components/ToastContainer.vue';

const authStore = useAuthStore();

// Session restore on app boot
onMounted(async () => {
  if (authStore.token) {
    await authStore.fetchProfile();
  }
});
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>
