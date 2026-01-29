<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'

const authStore = useAuthStore()

interface Task {
  id: string
  seqNo: number
  status: string
  asset: { originalUrl: string }
  listing: { title: string }
}

const tasks = ref<Task[]>([])
const loading = ref(true)

async function fetchTasks() {
  loading.value = true
  try {
    const response = await apiClient.get('/tasks')
    tasks.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
  } finally {
    loading.value = false
  }
}

async function leaseTask(id: string) {
  try {
    await apiClient.post(`/tasks/${id}/lease`)
    await fetchTasks()
  } catch (error) {
    console.error('Failed to lease task:', error)
  }
}

async function submitTask(id: string) {
  try {
    // Create a sample annotation for demo
    await apiClient.post('/annotations/raw', {
      taskId: id,
      rawJson: { labels: ['sample_label'], bbox: [0, 0, 100, 100] }
    })
    await apiClient.post(`/tasks/${id}/submit`)
    await fetchTasks()
  } catch (error) {
    console.error('Failed to submit task:', error)
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ready': return 'badge-info'
    case 'leased': return 'badge-warning'
    case 'submitted': return 'badge-success'
    case 'accepted': return 'badge-success'
    case 'rejected': return 'badge-error'
    default: return 'badge'
  }
}

function handleLogout() {
  authStore.logout()
}

onMounted(fetchTasks)
</script>

<template>
  <div class="min-h-screen bg-gray-100">
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
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Labeler Panel</p>
        <RouterLink to="/labeler/listings" class="flex items-center px-4 py-2 rounded-lg mb-1 text-gray-600 hover:bg-gray-100">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          İş Bul
        </RouterLink>
        <RouterLink to="/labeler/contracts" class="flex items-center px-4 py-2 rounded-lg mb-1 text-gray-600 hover:bg-gray-100">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Sözleşmelerim
        </RouterLink>
        <RouterLink to="/labeler/tasks" class="flex items-center px-4 py-2 rounded-lg mb-1 bg-primary-50 text-primary-700">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Görevlerim
        </RouterLink>
      </nav>
    </aside>

    <div class="ml-64">
      <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6">
        <h1 class="text-xl font-semibold text-gray-900">Görevlerim</h1>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-600">{{ authStore.user?.email }}</span>
          <button @click="handleLogout" class="text-sm text-red-600 hover:text-red-700">Çıkış</button>
        </div>
      </header>

      <main class="p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Etiketleme Görevleri</h2>

        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="tasks.length === 0" class="text-center py-12">
          <p class="text-gray-500">Henüz görev atanmamış.</p>
        </div>

        <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="task in tasks" :key="task.id" class="card hover:shadow-lg transition-shadow">
            <div class="aspect-video bg-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
              <img v-if="task.asset?.originalUrl" :src="task.asset.originalUrl" alt="Asset" class="w-full h-full object-cover" />
              <span v-else class="text-gray-400">Görsel yok</span>
            </div>
            <div class="flex justify-between items-center mb-2">
              <span class="font-medium text-gray-900">Task #{{ task.seqNo }}</span>
              <span :class="getStatusBadge(task.status)">{{ task.status }}</span>
            </div>
            <p class="text-sm text-gray-600 mb-3">{{ task.listing?.title }}</p>
            <div class="flex gap-2">
              <button v-if="task.status === 'ready'" @click="leaseTask(task.id)" class="flex-1 btn-primary text-sm">
                Kilitle
              </button>
              <button v-if="task.status === 'leased'" @click="submitTask(task.id)" class="flex-1 btn-primary text-sm">
                Teslim Et
              </button>
              <span v-if="task.status === 'submitted'" class="flex-1 text-center text-sm text-gray-500">Beklemede</span>
              <span v-if="task.status === 'accepted'" class="flex-1 text-center text-sm text-green-600 font-medium">✓ Onaylandı</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
