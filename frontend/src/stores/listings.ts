/**
 * Listings Store - State management for listings
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { listingsApi, type ListingListParams } from '@/api/listings';
import type { Listing, ListingWithDetails, ListingStatus, CreateListingRequest, UpdateListingRequest } from '@/types/listing';
import { getErrorMessage } from '@/types/api';
import { useToastStore } from './toast';

export const useListingsStore = defineStore('listings', () => {
  const toastStore = useToastStore();

  // State
  const listings = ref<Listing[]>([]);
  const currentListing = ref<ListingWithDetails | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Pagination
  const page = ref(1);
  const limit = ref(10);
  const total = ref(0);
  const totalPages = computed(() => Math.ceil(total.value / limit.value));

  // Filters
  const search = ref('');
  const statusFilter = ref<ListingStatus | ''>('');

  /**
   * Fetch paginated listings list
   */
  async function fetchListings(params: ListingListParams = {}) {
    loading.value = true;
    error.value = null;

    try {
      const response = await listingsApi.list({
        page: params.page ?? page.value,
        limit: params.limit ?? limit.value,
        search: params.search ?? (search.value || undefined),
        status: params.status ?? (statusFilter.value || undefined),
      });

      listings.value = response.data.data;
      total.value = response.data.pagination?.total ?? response.data.data.length;
      page.value = params.page ?? page.value;

      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'İlanlar yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch single listing by ID
   */
  async function fetchListing(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await listingsApi.get(id);
      currentListing.value = response.data.data;
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'İlan yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new listing
   */
  async function createListing(data: CreateListingRequest) {
    loading.value = true;
    error.value = null;

    try {
      const response = await listingsApi.create(data);
      listings.value.unshift(response.data.data);
      total.value += 1;
      toastStore.success('İlan başarıyla oluşturuldu');
      return response.data.data;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'İlan oluşturulamadı');
      toastStore.error(error.value);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update an existing listing
   */
  async function updateListing(id: string, data: UpdateListingRequest) {
    loading.value = true;
    error.value = null;

    try {
      const response = await listingsApi.update(id, data);
      const index = listings.value.findIndex((l) => l.id === id);
      if (index > -1) {
        listings.value[index] = response.data.data;
      }
      toastStore.success('İlan başarıyla güncellendi');
      return response.data.data;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'İlan güncellenemedi');
      toastStore.error(error.value);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete a listing
   */
  async function deleteListing(id: string) {
    loading.value = true;
    error.value = null;

    try {
      await listingsApi.delete(id);
      listings.value = listings.value.filter((l) => l.id !== id);
      total.value -= 1;
      toastStore.success('İlan başarıyla silindi');
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'İlan silinemedi');
      toastStore.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Publish a listing
   */
  async function publishListing(id: string) {
    loading.value = true;
    try {
      const response = await listingsApi.publish(id);
      const index = listings.value.findIndex((l) => l.id === id);
      if (index > -1) {
        listings.value[index] = response.data.data;
      }
      toastStore.success('İlan yayınlandı');
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'İlan yayınlanamadı'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Unpublish a listing
   */
  async function unpublishListing(id: string) {
    loading.value = true;
    try {
      const response = await listingsApi.unpublish(id);
      const index = listings.value.findIndex((l) => l.id === id);
      if (index > -1) {
        listings.value[index] = response.data.data;
      }
      toastStore.success('İlan yayından kaldırıldı');
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'İlan yayından kaldırılamadı'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Close a listing
   */
  async function closeListing(id: string) {
    loading.value = true;
    try {
      const response = await listingsApi.close(id);
      const index = listings.value.findIndex((l) => l.id === id);
      if (index > -1) {
        listings.value[index] = response.data.data;
      }
      toastStore.success('İlan kapatıldı');
      return true;
    } catch (_err) {
      toastStore.error(getErrorMessage(_err, 'İlan kapatılamadı'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Set search term and refetch
   */
  async function setSearch(term: string) {
    search.value = term;
    page.value = 1;
    return fetchListings();
  }

  /**
   * Set status filter and refetch
   */
  async function setStatusFilter(status: ListingStatus | '') {
    statusFilter.value = status;
    page.value = 1;
    return fetchListings();
  }

  /**
   * Go to specific page
   */
  async function goToPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage;
      return fetchListings();
    }
    return false;
  }

  /**
   * Reset store state
   */
  function reset() {
    listings.value = [];
    currentListing.value = null;
    loading.value = false;
    error.value = null;
    page.value = 1;
    total.value = 0;
    search.value = '';
    statusFilter.value = '';
  }

  return {
    // State
    listings,
    currentListing,
    loading,
    error,
    // Pagination
    page,
    limit,
    total,
    totalPages,
    search,
    statusFilter,
    // Actions
    fetchListings,
    fetchListing,
    createListing,
    updateListing,
    deleteListing,
    publishListing,
    unpublishListing,
    closeListing,
    setSearch,
    setStatusFilter,
    goToPage,
    reset,
  };
});
