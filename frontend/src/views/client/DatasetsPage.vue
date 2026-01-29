<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'

const authStore = useAuthStore()

interface Dataset {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  _count: { assets: number }
}

const datasets = ref<Dataset[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const newDataset = ref({ name: '', description: '' })

async function fetchDatasets() {
  loading.value = true
  try {
    const response = await apiClient.get('/datasets')
    datasets.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch datasets:', error)
  } finally {
    loading.value = false
  }
}

async function createDataset() {
  try {
    await apiClient.post('/datasets', newDataset.value)
    showCreateModal.value = false
    newDataset.value = { name: '', description: '' }
    await fetchDatasets()
  } catch (error) {
    console.error('Failed to create dataset:', error)
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ready': return 'badge-success'
    case 'uploading': return 'badge-warning'
    case 'draft': return 'badge-info'
    default: return 'badge'
  }
}

function handleLogout() {
  authStore.logout()
}

onMounted(fetchDatasets)
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
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client Panel</p>
        <RouterLink to="/client/datasets" class="flex items-center px-4 py-2 rounded-lg mb-1 bg-primary-50 text-primary-700">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          Datasets
        </RouterLink>
        <RouterLink to="/client/listings" class="flex items-center px-4 py-2 rounded-lg mb-1 text-gray-600 hover:bg-gray-100">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Listings
        </RouterLink>
        <RouterLink to="/client/contracts" class="flex items-center px-4 py-2 rounded-lg mb-1 text-gray-600 hover:bg-gray-100">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Contracts
        </RouterLink>
      </nav>
    </aside>

    <!-- Main -->
    <div class="ml-64">
      <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6">
        <h1 class="text-xl font-semibold text-gray-900">Datasets</h1>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-600">{{ authStore.user?.email }}</span>
          <button @click="handleLogout" class="text-sm text-red-600 hover:text-red-700">Çıkış</button>
        </div>
      </header>

      <main class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Datasetlerim</h2>
          <button @click="showCreateModal = true" class="btn-primary">+ Yeni Dataset</button>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="datasets.length === 0" class="text-center py-12">
          <p class="text-gray-500">Henüz dataset yok. İlk datasetinizi oluşturun!</p>
        </div>

        <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="dataset in datasets" :key="dataset.id" class="card hover:shadow-lg transition-shadow">
            <div class="flex justify-between items-start mb-3">
              <h3 class="font-semibold text-gray-900">{{ dataset.name }}</h3>
              <span :class="getStatusBadge(dataset.status)">{{ dataset.status }}</span>
            </div>
            <p class="text-sm text-gray-600 mb-3">{{ dataset.description || 'Açıklama yok' }}</p>
            <div class="text-xs text-gray-500">
              {{ dataset._count.assets }} asset • {{ new Date(dataset.createdAt).toLocaleDateString('tr-TR') }}
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Yeni Dataset</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">İsim</label>
            <input v-model="newDataset.name" type="text" class="input" placeholder="Dataset ismi" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea v-model="newDataset.description" class="input" rows="3" placeholder="Açıklama (opsiyonel)"></textarea>
          </div>
        </div>
        <div class="flex justify-end space-x-3 mt-6">
          <button @click="showCreateModal = false" class="btn-secondary">İptal</button>
          <button @click="createDataset" class="btn-primary">Oluştur</button>
        </div>
      </div>
    </div>
  </div>
</template>
