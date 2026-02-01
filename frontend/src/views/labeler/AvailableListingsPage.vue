<script setup lang="ts">
/**
 * AvailableListingsPage - Labeler job board showing published listings
 */
import { ref, onMounted, watch } from 'vue';
import { useSeo } from '@/composables/useSeo';
import { useToastStore } from '@/stores/toast';
import apiClient from '@/api/client';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import BaseModal from '@/components/ui/BaseModal.vue';

useSeo({
  title: 'Mevcut İlanlar',
  description: 'Etiketleme iş ilanlarını görüntüleyin ve başvurun.',
});

const toastStore = useToastStore();

interface PublicListing {
  id: string;
  title: string;
  description: string | null;
  datasetName: string;
  clientName: string;
  pricePerAsset: number;
  currency: string;
  totalAssets: number;
  remainingAssets: number;
  annotationFormat: string;
  createdAt: string;
}

// State
const listings = ref<PublicListing[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref(1);
const total = ref(0);
const limit = ref(10);
const totalPages = ref(0);

// Search
const searchInput = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

// Apply modal
const showApplyModal = ref(false);
const applyingListing = ref<PublicListing | null>(null);
const applyLoading = ref(false);

async function fetchListings() {
  loading.value = true;
  error.value = null;

  try {
    const response = await apiClient.get('/listings/public', {
      params: {
        page: page.value,
        limit: limit.value,
        search: searchInput.value || undefined,
      },
    });

    listings.value = response.data.data;
    total.value = response.data.pagination?.total ?? response.data.data.length;
    totalPages.value = Math.ceil(total.value / limit.value);
  } catch (_err) {
    error.value = 'İlanlar yüklenemedi';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchListings);

watch(searchInput, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    fetchListings();
  }, 300);
});

function openApplyModal(listing: PublicListing) {
  applyingListing.value = listing;
  showApplyModal.value = true;
}

async function handleApply() {
  if (!applyingListing.value) return;

  applyLoading.value = true;
  try {
    await apiClient.post('/contracts', {
      listingId: applyingListing.value.id,
    });
    toastStore.success('Başvurunuz alındı! Müşteri onayını bekleyiniz.');
    showApplyModal.value = false;
    applyingListing.value = null;
    // Refresh to show updated
    fetchListings();
  } catch (_err) {
    toastStore.error('Başvuru yapılamadı. Bu ilana zaten başvurmuş olabilirsiniz.');
  } finally {
    applyLoading.value = false;
  }
}

function goToPage(newPage: number) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
    fetchListings();
  }
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(price);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR');
}
</script>

<template>
  <AppLayout>
    <template #header>Mevcut İlanlar</template>

    <!-- Toolbar -->
    <div class="flex justify-between items-center gap-4 mb-6">
      <div class="relative flex-1 max-w-md">
        <input
          v-model="searchInput"
          type="search"
          placeholder="İlan ara..."
          class="input pl-10"
          aria-label="İlan ara"
        />
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && listings.length === 0" class="space-y-4">
      <div v-for="i in 4" :key="i" class="card">
        <BaseSkeleton variant="text" class="w-1/3 mb-2" />
        <BaseSkeleton variant="text" class="w-2/3 mb-2" />
        <BaseSkeleton variant="text" class="w-1/4" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
      <BaseButton variant="secondary" @click="fetchListings">Tekrar Dene</BaseButton>
    </div>

    <!-- Empty -->
    <BaseEmptyState
      v-else-if="listings.length === 0"
      :icon="searchInput ? 'search' : 'database'"
      :title="searchInput ? 'Sonuç bulunamadı' : 'Şu anda ilan yok'"
      :description="searchInput ? 'Aramanızı değiştirin.' : 'Yeni ilanlar eklendiğinde burada görünecektir.'"
    />

    <!-- Listings -->
    <div v-else class="space-y-4">
      <article
        v-for="listing in listings"
        :key="listing.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex flex-col lg:flex-row justify-between gap-4">
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {{ listing.title }}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate-2">
              {{ listing.description || 'Açıklama yok' }}
            </p>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span>Müşteri: {{ listing.clientName }}</span>
              <span>Dataset: {{ listing.datasetName }}</span>
              <span>Format: {{ listing.annotationFormat }}</span>
              <span>{{ formatDate(listing.createdAt) }}</span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <p class="text-xl font-bold text-gray-900 dark:text-white">
              {{ formatPrice(listing.pricePerAsset, listing.currency) }}/asset
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ listing.remainingAssets }} / {{ listing.totalAssets }} kalan
            </p>
            <BaseButton variant="primary" @click="openApplyModal(listing)">
              Başvur
            </BaseButton>
          </div>
        </div>
      </article>
    </div>

    <!-- Pagination -->
    <BasePagination
      :current-page="page"
      :total-pages="totalPages"
      :loading="loading"
      class="mt-6"
      @page-change="goToPage"
    />

    <!-- Apply Modal -->
    <BaseModal :open="showApplyModal" title="İlana Başvur" size="md" @close="showApplyModal = false">
      <div v-if="applyingListing" class="space-y-4">
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">{{ applyingListing.title }}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ applyingListing.remainingAssets }} asset için {{ formatPrice(applyingListing.pricePerAsset, applyingListing.currency) }}/asset
          </p>
        </div>
        <p class="text-gray-600 dark:text-gray-400">
          Bu ilana başvurmak istediğinizden emin misiniz? Müşteri başvurunuzu onayladığında size bildirim gönderilecektir.
        </p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showApplyModal = false">İptal</BaseButton>
        <BaseButton variant="primary" :loading="applyLoading" @click="handleApply">
          Başvur
        </BaseButton>
      </template>
    </BaseModal>
  </AppLayout>
</template>
