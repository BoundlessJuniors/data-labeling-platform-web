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
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import ListingCard from '@/components/listings/ListingCard.vue';

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
  priceTotal: number;
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
    const response = await apiClient.get('/listings', {
      params: {
        status: 'open',
        page: page.value,
        limit: limit.value,
        search: searchInput.value || undefined,
      },
    });

    // Map nested Prisma response to flat PublicListing shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listings.value = (response.data.data as Record<string, any>[]).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      datasetName: item.dataset?.name ?? '',
      clientName: item.owner?.displayName ?? '',
      priceTotal: item.priceTotal,
      currency: item.currency,
      totalAssets: item.dataset?._count?.assets ?? 0,
      remainingAssets: item.dataset?._count?.assets ?? 0,
      annotationFormat: item.labelingSpecJson?.annotationFormat ?? '',
      createdAt: item.createdAt,
    }));
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
    await apiClient.post('/proposals', {
      listingId: applyingListing.value.id,
      priceQuote: applyingListing.value.priceTotal,
    });
    toastStore.success('Başvurunuz alındı! Müşteri onayını bekleyiniz.');
    showApplyModal.value = false;
    applyingListing.value = null;
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
          class="bg-gray-50 border-none rounded-xl py-3 pl-10 pr-4 w-full max-w-md text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:bg-gray-800 dark:text-white"
          aria-label="İlan ara"
        />
        <svg
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
    <div v-if="loading && listings.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[28px] p-5 shadow-sm">
        <div class="h-40 bg-gray-50 dark:bg-gray-700 rounded-2xl mb-4 animate-pulse"></div>
        <div class="h-3 w-1/4 bg-gray-200 dark:bg-gray-600 rounded mb-2 animate-pulse"></div>
        <div class="h-5 w-3/4 bg-gray-200 dark:bg-gray-600 rounded mb-2 animate-pulse"></div>
        <div class="h-4 w-1/2 bg-gray-200 dark:bg-gray-600 rounded mt-2 animate-pulse"></div>
        <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-50 dark:border-gray-700">
          <div class="space-y-1 w-1/3">
            <div class="h-3 w-full bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
            <div class="h-5 w-full bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
          </div>
          <div class="h-10 w-24 bg-gray-200 dark:bg-gray-600 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm text-center py-12 p-6">
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
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ListingCard
        v-for="listing in listings"
        :key="listing.id"
        :listing="listing"
        @apply="openApplyModal"
      />
    </div>

    <!-- Pagination -->
    <BasePagination
      :current-page="page"
      :total-pages="totalPages"
      :loading="loading"
      class="mt-8"
      @page-change="goToPage"
    />

    <!-- Apply Modal -->
    <BaseModal :open="showApplyModal" title="İlana Başvur" size="md" @close="showApplyModal = false">
      <div v-if="applyingListing" class="space-y-4">
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">{{ applyingListing.title }}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ applyingListing.remainingAssets }} asset için toplam {{ formatPrice(applyingListing.priceTotal, applyingListing.currency) }}
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
