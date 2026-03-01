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
  <article class="relative overflow-hidden rounded-[28px] bg-white/80 dark:bg-gray-900/50 border border-gray-200/60 dark:border-white/10 p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/5 hover:shadow-lg hover:-translate-y-0.5 transition duration-300 group">
    <!-- Subtle gradient halo -->
    <div aria-hidden="true" class="pointer-events-none absolute -inset-1 opacity-0 group-hover:opacity-100 transition duration-300">
      <div class="absolute inset-0 bg-gradient-to-br from-primary-500/15 via-transparent to-fuchsia-500/10 blur-2xl" />
    </div>

    <!-- Visual Block (Top) -->
    <div class="relative h-40 rounded-2xl mb-4 overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 ring-1 ring-black/5 dark:ring-white/10">
      <div aria-hidden="true" class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary-500/10 blur-2xl" />
      <div aria-hidden="true" class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-2xl" />
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
      <span v-if="listing.annotationFormat" class="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 ring-1 ring-black/5 dark:ring-white/10">
        {{ listing.annotationFormat }}
      </span>
      <h2 class="mt-2 text-[15px] leading-5 font-extrabold text-gray-900 dark:text-white line-clamp-2" :title="listing.title">
        {{ listing.title }}
      </h2>
    </div>

    <!-- Meta Data -->
    <div class="mt-3 space-y-1">
      <p class="text-xs font-medium text-gray-600 dark:text-gray-300 line-clamp-1">
        <span class="text-gray-400 dark:text-gray-500">Dataset:</span> {{ listing.datasetName }}
      </p>
      <p class="text-xs font-medium text-gray-600 dark:text-gray-300 line-clamp-1">
        <span class="text-gray-400 dark:text-gray-500">Müşteri:</span> {{ listing.clientName }}
      </p>
      <p class="text-xs font-medium text-gray-600 dark:text-gray-300 line-clamp-1">
        <span class="text-gray-400 dark:text-gray-500">Toplam Görsel:</span> {{ listing.totalAssets }}
      </p>
    </div>

    <!-- Bottom Row (Price & Action) -->
    <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-50 dark:border-gray-700/50">
      <div class="flex flex-col">
        <span class="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider mb-0.5">Fiyat</span>
        <span class="text-[18px] leading-6 font-extrabold text-primary-600 dark:text-primary-400">
          {{ formatPrice(listing.priceTotal, listing.currency) }}
        </span>
      </div>
      <BaseButton
        variant="primary"
        @click="emit('apply', listing)"
      >
        Başvur
      </BaseButton>
    </div>
  </article>
</template>
