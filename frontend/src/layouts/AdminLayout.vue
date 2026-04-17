<script setup lang="ts">
/**
 * AdminLayout - Dedicated layout for all /admin routes.
 * Wraps child pages via RouterView. Admin pages must NOT also use AppLayout.
 */
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const pageTitle = computed(() => (route.meta.title as string) || 'Admin')

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
      { label: 'Kullanıcılar', path: '/admin/users', icon: 'users' },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Upload Monitoring', path: '/admin/monitoring/uploads', icon: 'upload' },
      { label: 'Queue Monitoring', path: '/admin/monitoring/queues', icon: 'queue' },
    ],
  },
]

function isActive(path: string): boolean {
  // Exact match for dashboard, prefix match for others
  if (path === '/admin') {
    return route.path === '/admin' || route.path === '/admin/';
  }
  return route.path.startsWith(path);
}

function handleLogout() {
  authStore.logout()
  window.location.href = '/login'
}
</script>

<template>
  <div class="h-screen h-[100dvh] overflow-hidden bg-gray-50 dark:bg-gray-900 p-4 md:p-6 flex gap-6 shrink-0">
    <!-- Sidebar -->
    <aside
      class="w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex flex-col overflow-hidden shrink-0"
      aria-label="Admin sidebar navigation"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700">
        <RouterLink to="/admin" class="text-xl font-bold text-primary-600 dark:text-primary-400">
          DataLabel
        </RouterLink>
        <span class="ml-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Admin</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-4 space-y-4 overflow-y-auto scrollbar-thin">
        <div v-for="(section, sIdx) in navSections" :key="sIdx">
          <p
            v-if="section.title"
            class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4"
          >
            {{ section.title }}
          </p>
          <RouterLink
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            :class="[
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5',
              isActive(item.path)
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
            ]"
            :aria-current="isActive(item.path) ? 'page' : undefined"
          >
            <!-- Icons -->
            <span class="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <!-- Dashboard -->
                <path
                  v-if="item.icon === 'dashboard'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
                <!-- Users -->
                <path
                  v-else-if="item.icon === 'users'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
                <!-- Upload -->
                <path
                  v-else-if="item.icon === 'upload'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
                <!-- Queue -->
                <path
                  v-else-if="item.icon === 'queue'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </span>
            {{ item.label }}
          </RouterLink>
        </div>
      </nav>

      <!-- User section -->
      <div class="px-4 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0"
          >
            <span class="text-primary-600 dark:text-primary-300 font-medium">
              {{ authStore.user?.displayName?.[0] || authStore.user?.email[0]?.toUpperCase() }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
              {{ authStore.user?.displayName || authStore.user?.email }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
              {{ authStore.user?.role }}
            </p>
          </div>
          <button
            type="button"
            class="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shrink-0"
            aria-label="Çıkış yap"
            @click="handleLogout"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden min-w-0">
      <!-- Top bar -->
      <header
        class="h-16 px-6 py-2 flex items-center border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 z-20"
      >
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
      </header>

      <!-- Page content -->
      <main class="flex-1 p-6 overflow-auto relative">
        <RouterView />
      </main>
    </div>
  </div>
</template>
