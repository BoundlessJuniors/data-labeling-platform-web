<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import type { Proposal } from '@/types/proposal';

defineProps<{
  proposal: Proposal;
  currency?: string;
}>();

const emit = defineEmits<{
  (e: 'accept', proposal: Proposal): void;
  (e: 'reject', proposal: Proposal): void;
  (e: 'read-more', proposal: Proposal): void;
}>();

function formatPrice(price: number, currency?: string) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
  }).format(price);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatRating(rating: number | null) {
  if (rating === null || rating === undefined) return 'Değerlendirilmemiş';
  return `⭐ ${Number(rating).toFixed(1)}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return 'badge-warning';
    case 'accepted':
      return 'badge-success';
    case 'rejected':
      return 'badge-neutral';
    case 'withdrawn':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Beklemede';
    case 'accepted':
      return 'Kabul Edildi';
    case 'rejected':
      return 'Reddedildi';
    case 'withdrawn':
      return 'Geri Çekildi';
    default:
      return status;
  }
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
</script>

<template>
  <article 
    class="card"
    :class="{
      'hover:shadow-lg transition-shadow border-l-4 border-l-yellow-400': proposal.status === 'pending',
      'opacity-75': proposal.status !== 'pending'
    }"
  >
    <!-- Pending Layout -->
    <div v-if="proposal.status === 'pending'" class="flex flex-col lg:flex-row justify-between gap-4">
      <!-- Labeler info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <span class="text-primary-700 dark:text-primary-300 font-semibold text-sm">
              {{ (proposal.labeler.displayName || proposal.labeler.email).charAt(0).toUpperCase() }}
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-gray-900 dark:text-white">
              {{ proposal.labeler.displayName || 'İsimsiz Kullanıcı' }}
            </h4>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ proposal.labeler.email }}</p>
          </div>
          <span class="text-sm text-gray-600 dark:text-gray-400 ml-auto lg:ml-2">
            {{ formatRating(proposal.labeler.ratingAvg) }}
          </span>
        </div>

        <!-- Price & Date -->
        <div class="flex items-center gap-4 text-sm mb-2">
          <span class="font-bold text-green-600 dark:text-green-400">
            Teklif: {{ formatPrice(proposal.priceQuote, currency) }}
          </span>
          <span class="text-blue-600 dark:text-blue-400 font-medium">
            Teslim: {{ proposal.deliveryDays ?? 7 }} gün
          </span>
          <span class="text-gray-500 dark:text-gray-400">
            {{ formatDate(proposal.createdAt) }}
          </span>
        </div>

        <!-- Cover letter -->
        <div v-if="proposal.coverLetter" class="mt-2">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            {{ truncateText(proposal.coverLetter, 150) }}
            <button
              v-if="proposal.coverLetter.length > 150"
              type="button"
              class="text-primary-600 dark:text-primary-400 hover:underline ml-1 font-medium"
              @click="emit('read-more', proposal)"
            >
              Devamını oku
            </button>
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <BaseButton
          variant="primary"
          size="sm"
          class="!bg-green-600 hover:!bg-green-700 focus:!ring-green-500"
          @click="emit('accept', proposal)"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Kabul Et
        </BaseButton>
        <BaseButton
          variant="danger"
          size="sm"
          @click="emit('reject', proposal)"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reddet
        </BaseButton>
      </div>
    </div>

    <!-- Other Statuses Layout -->
    <div v-else class="flex flex-col sm:flex-row justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <span class="text-gray-500 dark:text-gray-400 font-semibold text-sm">
            {{ (proposal.labeler.displayName || proposal.labeler.email).charAt(0).toUpperCase() }}
          </span>
        </div>
        <div>
          <h4 class="font-medium text-gray-700 dark:text-gray-300">
            {{ proposal.labeler.displayName || 'İsimsiz Kullanıcı' }}
          </h4>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatPrice(proposal.priceQuote, currency) }} · Teslim: {{ proposal.deliveryDays ?? 7 }} gün · {{ formatDate(proposal.createdAt) }}
          </p>
        </div>
      </div>
      <span :class="getStatusBadge(proposal.status)" class="self-start sm:self-center">
        {{ getStatusLabel(proposal.status) }}
      </span>
    </div>
  </article>
</template>
