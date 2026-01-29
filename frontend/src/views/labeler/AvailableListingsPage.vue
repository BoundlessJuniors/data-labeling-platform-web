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
  dataset: { name: string }
  owner: { displayName: string | null; email: string }
}

const listings = ref<Listing[]>([])
const loading = ref(true)

async function fetchListings() {
  loading.value = true
  try {
    const response = await apiClient.get('/listings?status=open')
    listings.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch listings:', error)
  } finally {
    loading.value = false
  }
}

async function applyToListing(listingId: string) {
  try {
    await apiClient.post('/contracts', { listingId })
    alert('Başvurunuz alındı!')
    await fetchListings()
  } catch (error: any) {
    alert(error.response?.data?.error || 'Başvuru başarısız')
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
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Labeler Panel</p>
        <RouterLink to="/labeler/listings" class="flex items-center px-4 py-2 rounded-lg mb-1 bg-primary-50 text-primary-700">
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
        <RouterLink to="/labeler/tasks" class="flex items-center px-4 py-2 rounded-lg mb-1 text-gray-600 hover:bg-gray-100">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Görevlerim
        </RouterLink>
      </nav>
    </aside>

    <div class="ml-64">
      <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6">
        <h1 class="text-xl font-semibold text-gray-900">İş Bul</h1>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-600">{{ authStore.user?.email }}</span>
          <button @click="handleLogout" class="text-sm text-red-600 hover:text-red-700">Çıkış</button>
        </div>
      </header>

      <main class="p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Açık İş İlanları</h2>

        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="listings.length === 0" class="text-center py-12">
          <p class="text-gray-500">Şu anda açık iş ilanı bulunmuyor.</p>
        </div>

        <div v-else class="grid md:grid-cols-2 gap-6">
          <div v-for="listing in listings" :key="listing.id" class="card hover:shadow-lg transition-shadow">
            <div class="flex justify-between items-start mb-3">
              <h3 class="font-semibold text-gray-900">{{ listing.title }}</h3>
              <span class="badge-success">{{ listing.status }}</span>
            </div>
            <p class="text-sm text-gray-600 mb-3">{{ listing.description || 'Açıklama yok' }}</p>
            <div class="text-xs text-gray-500 mb-4">
              <p>Dataset: {{ listing.dataset.name }}</p>
              <p>İşveren: {{ listing.owner.displayName || listing.owner.email }}</p>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-lg font-bold text-primary-600">{{ listing.priceTotal }} {{ listing.currency }}</span>
              <button @click="applyToListing(listing.id)" class="btn-primary">Başvur</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
