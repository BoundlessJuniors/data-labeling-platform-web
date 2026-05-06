<script setup lang="ts">
/**
 * AdminLayout - Dedicated layout for all /admin routes.
 * Wraps child pages via RouterView. Admin pages must NOT also use AppLayout.
 */
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const authStore = useAuthStore()
const { isDark, toggleTheme } = useTheme()

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
  {
    title: 'Operations',
    items: [
      { label: 'Contracts', path: '/admin/contracts', icon: 'contracts' },
      { label: 'Payments', path: '/admin/payments', icon: 'payments' },
      { label: 'Tasks', path: '/admin/tasks', icon: 'tasks' },
      { label: 'Reviews', path: '/admin/reviews', icon: 'reviews' },
      { label: 'Annotations', path: '/admin/annotations', icon: 'annotations' },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'audit' },
    ],
  },
  {
    title: 'Beta',
    items: [
      { label: 'Invite Requests', path: '/admin/invite-requests', icon: 'invite' },
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
  <div class="h-screen h-[100dvh] overflow-hidden bg-gray-50 dark:bg-[#0f172a] p-4 md:p-6 flex gap-6 shrink-0">
    <!-- Sidebar -->
    <aside
      class="w-64 bg-white dark:bg-[#111827] rounded-2xl shadow-sm flex flex-col overflow-hidden shrink-0"
      aria-label="Admin sidebar navigation"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center px-6 border-b border-gray-100 dark:border-[#334155]">
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
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#1f2937]',
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
                <!-- Contracts -->
                <path
                  v-else-if="item.icon === 'contracts'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
                <!-- Payments -->
                <path
                  v-else-if="item.icon === 'payments'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
                <!-- Tasks -->
                <path
                  v-else-if="item.icon === 'tasks'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
                <!-- Reviews -->
                <path
                  v-else-if="item.icon === 'reviews'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
                <!-- Annotations -->
                <path
                  v-else-if="item.icon === 'annotations'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
                <!-- Audit -->
                <path
                  v-else-if="item.icon === 'audit'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
                <!-- Invite -->
                <path
                  v-else-if="item.icon === 'invite'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </span>
            {{ item.label }}
          </RouterLink>
        </div>
      </nav>

      <!-- User section -->
      <div class="px-4 py-4 border-t border-gray-100 dark:border-[#334155] bg-white dark:bg-[#111827] shrink-0">
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
          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1f2937] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Temayı değiştir"
              @click="toggleTheme"
            >
              <!-- Sun Icon -->
              <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <!-- Moon Icon -->
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1f2937] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col bg-white dark:bg-[#111827] rounded-2xl shadow-sm overflow-hidden min-w-0">
      <!-- Top bar -->
      <header
        class="h-16 px-6 py-2 flex items-center border-b border-gray-100 dark:border-[#334155] bg-white dark:bg-[#111827] shrink-0 z-20"
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
