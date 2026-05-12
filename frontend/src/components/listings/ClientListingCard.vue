<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import type { Listing } from '@/types/listing';

defineProps<{
  listing: Listing;
}>();

const emit = defineEmits<{
  (e: 'view-proposals', id: string): void;
  (e: 'edit', listing: Listing): void;
  (e: 'delete', id: string): void;
}>();

function getStatusBadge(status: string) {
  switch (status) {
    case 'open':
      return 'badge-success';
    case 'payment_pending':
      return 'badge-warning';
    case 'in_progress':
      return 'badge-info';
    case 'completed':
      return 'badge-info';
    case 'cancelled':
      return 'badge-neutral';
    default:
      return 'badge-neutral';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'open':
      return 'Açık';
    case 'payment_pending':
      return 'Ödeme Bekliyor';
    case 'in_progress':
      return 'Devam Ediyor';
    case 'completed':
      return 'Tamamlandı';
    case 'cancelled':
      return 'İptal Edildi';
    default:
      return status;
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
  <article class="card hover:shadow-lg transition-shadow">
    <div class="flex flex-col sm:flex-row justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-start gap-3 flex-wrap">
          <h2 class="font-semibold text-gray-900 dark:text-white truncate">{{ listing.title }}</h2>
          <span :class="getStatusBadge(listing.status)" class="flex-shrink-0">
            {{ getStatusLabel(listing.status) }}
          </span>
          <span v-if="listing.dataset?.name" class="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded flex-shrink-0">
            Dataset: {{ listing.dataset.name }}
          </span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate-2">
          {{ listing.description || 'Açıklama yok' }}
        </p>
        <div class="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{{ formatDate(listing.createdAt) }}</span>
        </div>
      </div>
      <div class="flex flex-col items-end gap-2">
        <p class="text-lg font-bold text-gray-900 dark:text-white">
          {{ formatPrice(listing.priceTotal, listing.currency) }}
        </p>
        <!-- Actions -->
        <div class="flex gap-1">
          <!-- View proposals — visible for all listings -->
          <BaseButton
            variant="outline"
            size="sm"
            @click="emit('view-proposals', listing.id)"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Başvuruları Gör
          </BaseButton>
          <!-- Edit — only for open listings -->
          <button
            v-if="listing.status === 'open'"
            type="button"
            class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Düzenle"
            @click="emit('edit', listing)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <!-- Delete — only for open listings -->
          <button
            v-if="listing.status === 'open'"
            type="button"
            class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
            aria-label="Sil"
            @click="emit('delete', listing.id)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
