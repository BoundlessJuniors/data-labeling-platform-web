<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const navigation = [
  { name: 'Kullanıcılar', path: '/admin/users', icon: 'users' },
]

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Sidebar -->
    <aside class="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
      <div class="flex items-center justify-center h-16 border-b">
        <RouterLink to="/" class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold">D</span>
          </div>
          <span class="font-bold text-gray-900">DataLabel</span>
        </RouterLink>
      </div>
      
      <nav class="mt-6 px-4">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Admin Panel
        </p>
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex items-center px-4 py-2 rounded-lg mb-1 transition-colors',
            route.path === item.path 
              ? 'bg-primary-50 text-primary-700' 
              : 'text-gray-600 hover:bg-gray-100'
          ]"
        >
          <svg v-if="item.icon === 'users'" class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          {{ item.name }}
        </RouterLink>
      </nav>
    </aside>

    <!-- Main content -->
    <div class="ml-64">
      <!-- Topbar -->
      <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6">
        <h1 class="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-600">
            {{ authStore.user?.displayName || authStore.user?.email }}
          </span>
          <button @click="handleLogout" class="text-sm text-red-600 hover:text-red-700">
            Çıkış Yap
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
