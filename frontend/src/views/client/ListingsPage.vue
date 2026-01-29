<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'

const authStore = useAuthStore()

interface Listing {
  id: string
  title: string
  description: string | null
  status: string
  priceTotal: string
  currency: string
  createdAt: string
  dataset: { name: string }
}

const listings = ref<Listing[]>([])
const loading = ref(true)

async function fetchListings() {
  loading.value = true
  try {
    const response = await apiClient.get('/listings')
    listings.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch listings:', error)
  } finally {
    loading.value = false
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'open': return 'badge-success'
    case 'in_progress': return 'badge-warning'
    case 'completed': return 'badge-info'
    case 'cancelled': return 'badge-error'
    default: return 'badge'
  }
}

function handleLogout() {
  authStore.logout()
}

onMounted(fetchListings)
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
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client Panel</p>
        <RouterLink to="/client/datasets" class="flex items-center px-4 py-2 rounded-lg mb-1 text-gray-600 hover:bg-gray-100">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          Datasets
        </RouterLink>
        <RouterLink to="/client/listings" class="flex items-center px-4 py-2 rounded-lg mb-1 bg-primary-50 text-primary-700">
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

    <div class="ml-64">
      <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6">
        <h1 class="text-xl font-semibold text-gray-900">Listings</h1>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-600">{{ authStore.user?.email }}</span>
          <button @click="handleLogout" class="text-sm text-red-600 hover:text-red-700">Çıkış</button>
        </div>
      </header>

      <main class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900">İş İlanlarım</h2>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="listings.length === 0" class="text-center py-12">
          <p class="text-gray-500">Henüz ilan yok.</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="listing in listings" :key="listing.id" class="card hover:shadow-lg transition-shadow">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-semibold text-gray-900">{{ listing.title }}</h3>
                <p class="text-sm text-gray-600 mt-1">{{ listing.description || 'Açıklama yok' }}</p>
                <p class="text-xs text-gray-500 mt-2">Dataset: {{ listing.dataset.name }}</p>
              </div>
              <div class="text-right">
                <span :class="getStatusBadge(listing.status)">{{ listing.status }}</span>
                <p class="text-lg font-bold text-gray-900 mt-2">{{ listing.priceTotal }} {{ listing.currency }}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
