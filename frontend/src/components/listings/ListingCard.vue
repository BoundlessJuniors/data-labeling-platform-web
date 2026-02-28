<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';

export interface PublicListing {
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

defineProps<{
  listing: PublicListing;
}>();

const emit = defineEmits<{
  (e: 'apply', listing: PublicListing): void;
}>();

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(price);
}
</script>

<template>
  <article class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[28px] p-5 shadow-sm hover:shadow-md transition group">
    <!-- Visual Block (Top) -->
    <div class="h-40 bg-gray-50 dark:bg-gray-700/50 rounded-2xl relative flex justify-center items-center mb-4 overflow-hidden">
      <svg
        class="w-16 h-16 text-gray-300 dark:text-gray-500 transform group-hover:scale-110 transition duration-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <!-- Generic tag icon -->
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    </div>

    <!-- Header Data -->
    <div>
      <p class="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
        {{ listing.annotationFormat || 'BELİRTİLMEDİ' }}
      </p>
      <h2 class="text-base font-extrabold text-gray-800 dark:text-white mt-1 truncate" :title="listing.title">
        {{ listing.title }}
      </h2>
    </div>

    <!-- Meta Data -->
    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
      Dataset: {{ listing.datasetName }} • Müşteri: {{ listing.clientName }}
    </p>

    <!-- Bottom Row (Price & Action) -->
    <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-50 dark:border-gray-700/50">
      <div class="flex flex-col">
        <span class="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider mb-0.5">Fiyat</span>
        <span class="text-lg font-extrabold text-primary-600 dark:text-primary-400">
          {{ formatPrice(listing.priceTotal, listing.currency) }}
        </span>
      </div>
      <div class="flex flex-col items-end gap-1.5">
        <span class="text-xs text-gray-400 dark:text-gray-500 font-medium">
          {{ listing.remainingAssets }} / {{ listing.totalAssets }} kalan
        </span>
        <BaseButton
          variant="primary"
          @click="emit('apply', listing)"
        >
          Başvur
        </BaseButton>
      </div>
    </div>
  </article>
</template>
