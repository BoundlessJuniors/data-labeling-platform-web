<script setup lang="ts">
/**
 * AppLayout - Layout for authenticated users
 * Role-aware sidebar navigation
 */
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

const navItems = computed<NavItem[]>(() => {
  const role = authStore.user?.role;

  if (role === 'admin') {
    return [
      { label: 'Kullanıcılar', to: '/admin/users', icon: 'users' },
    ];
  }

  if (role === 'client') {
    return [
      { label: 'Datasets', to: '/client/datasets', icon: 'database' },
      { label: 'İlanlar', to: '/client/listings', icon: 'megaphone' },
      { label: 'Sözleşmeler', to: '/client/contracts', icon: 'document' },
    ];
  }

  if (role === 'labeler') {
    return [
      { label: 'İş Bul', to: '/labeler/listings', icon: 'search' },
      { label: 'Sözleşmelerim', to: '/labeler/contracts', icon: 'document' },
      { label: 'Görevlerim', to: '/labeler/tasks', icon: 'task' },
    ];
  }

  return [];
});

function isActive(path: string): boolean {
  return route.path.startsWith(path);
}

function handleLogout() {
  authStore.logout();
  window.location.href = '/login';
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
    <!-- Sidebar -->
    <aside
      class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
      aria-label="Sidebar navigation"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
        <RouterLink
          to="/dashboard"
          class="text-xl font-bold text-primary-600 dark:text-primary-400"
        >
          DataLabel
        </RouterLink>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive(item.to)
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
          ]"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          <!-- Icon placeholder -->
          <span class="w-5 h-5 flex items-center justify-center" aria-hidden="true">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                v-if="item.icon === 'users'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
              <path
                v-else-if="item.icon === 'database'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
              <path
                v-else-if="item.icon === 'megaphone'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
              />
              <path
                v-else-if="item.icon === 'document'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
              <path
                v-else-if="item.icon === 'search'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
              <path
                v-else-if="item.icon === 'task'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <!-- User section -->
      <div class="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center"
          >
            <span class="text-primary-600 dark:text-primary-300 font-medium">
              {{ authStore.user?.displayName?.[0] || authStore.user?.email[0]?.toUpperCase() }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
              {{ authStore.user?.displayName || authStore.user?.email }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {{ authStore.user?.role }}
            </p>
          </div>
          <button
            type="button"
            class="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Çıkış yap"
            @click="handleLogout"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top bar -->
      <header class="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center">
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
          <slot name="header" />
        </h1>
      </header>

      <!-- Page content -->
      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
