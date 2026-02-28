<script setup lang="ts">
/**
 * ListingProposalsPage - View and manage proposals for a listing
 */
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProposalsStore } from '@/stores/proposals';
import { useListingsStore } from '@/stores/listings';
import { useSeo } from '@/composables/useSeo';
import type { Proposal } from '@/types/proposal';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import ProposalCard from '@/components/proposals/ProposalCard.vue';

useSeo({
  title: 'Başvurular',
  description: 'İlana gelen başvuruları yönetin.',
});

const route = useRoute();
const router = useRouter();
const proposalsStore = useProposalsStore();
const listingsStore = useListingsStore();

const listingId = route.params.id as string;

// Modal state
const showAcceptModal = ref(false);
const showRejectModal = ref(false);
const selectedProposal = ref<Proposal | null>(null);
const showFullCoverLetter = ref(false);

// Fetch data on mount
onMounted(async () => {
  await Promise.all([
    listingsStore.fetchListing(listingId),
    proposalsStore.fetchProposalsByListing(listingId),
  ]);
});

const listing = computed(() => listingsStore.currentListing);

const pendingProposals = computed(() =>
  proposalsStore.proposals.filter((p) => p.status === 'pending')
);

const otherProposals = computed(() =>
  proposalsStore.proposals.filter((p) => p.status !== 'pending')
);

// Accept flow
function openAcceptModal(proposal: Proposal) {
  selectedProposal.value = proposal;
  showAcceptModal.value = true;
}

async function handleAccept() {
  if (!selectedProposal.value) return;
  const result = await proposalsStore.acceptProposal(selectedProposal.value.id);
  if (result) {
    showAcceptModal.value = false;
    selectedProposal.value = null;
    // Redirect to contracts page after a short delay
    setTimeout(() => {
      router.push({ name: 'client-contracts' });
    }, 1500);
  }
}

// Reject flow
function openRejectModal(proposal: Proposal) {
  selectedProposal.value = proposal;
  showRejectModal.value = true;
}

async function handleReject() {
  if (!selectedProposal.value) return;
  const result = await proposalsStore.rejectProposal(selectedProposal.value.id);
  if (result) {
    showRejectModal.value = false;
    selectedProposal.value = null;
  }
}

// Cover letter modal
function openCoverLetter(proposal: Proposal) {
  selectedProposal.value = proposal;
  showFullCoverLetter.value = true;
}

function formatPrice(price: number, currency?: string) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
  }).format(price);
}
</script>

<template>
  <AppLayout>
    <template #header>
      <div class="flex items-center gap-3">
        <BaseButton variant="ghost" size="sm" @click="router.push({ name: 'client-listings' })">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </BaseButton>
        <span>Başvurular</span>
      </div>
    </template>

    <!-- Listing Summary Header -->
    <div v-if="listing" class="card mb-6 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-800">
      <div class="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ listing.title }}</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ listing.description || 'Açıklama yok' }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-1">
          <span class="text-lg font-bold text-primary-700 dark:text-primary-300">
            {{ formatPrice(listing.priceTotal, listing.currency) }}
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ proposalsStore.proposals.length }} başvuru
          </span>
        </div>
      </div>
    </div>
    <div v-else-if="listingsStore.loading" class="card mb-6">
      <BaseSkeleton variant="text" class="w-1/3 mb-2" />
      <BaseSkeleton variant="text" class="w-2/3" />
    </div>

    <!-- Loading state -->
    <div v-if="proposalsStore.loading && proposalsStore.proposals.length === 0" class="space-y-4">
      <div v-for="i in 3" :key="i" class="card">
        <div class="flex justify-between">
          <div class="flex-1">
            <BaseSkeleton variant="text" class="w-1/4 mb-2" />
            <BaseSkeleton variant="text" class="w-1/2 mb-2" />
            <BaseSkeleton variant="text" class="w-1/3" />
          </div>
          <div class="flex gap-2">
            <BaseSkeleton variant="rectangular" class="w-20 h-8" />
            <BaseSkeleton variant="rectangular" class="w-20 h-8" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="proposalsStore.error && proposalsStore.proposals.length === 0" class="card text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ proposalsStore.error }}</p>
      <BaseButton variant="secondary" @click="proposalsStore.fetchProposalsByListing(listingId)">
        Tekrar Dene
      </BaseButton>
    </div>

    <!-- Empty state -->
    <BaseEmptyState
      v-else-if="proposalsStore.proposals.length === 0 && !proposalsStore.loading"
      icon="database"
      title="Henüz başvuru yok"
      description="Bu ilana henüz bir başvuru yapılmamış."
    >
      <template #action>
        <BaseButton variant="secondary" @click="router.push({ name: 'client-listings' })">
          İlanlara Dön
        </BaseButton>
      </template>
    </BaseEmptyState>

    <!-- Proposals list -->
    <div v-else class="space-y-6">
      <!-- Pending proposals -->
      <div v-if="pendingProposals.length > 0">
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Bekleyen Başvurular ({{ pendingProposals.length }})
        </h3>
        <div class="space-y-3">
          <ProposalCard
            v-for="proposal in pendingProposals"
            :key="proposal.id"
            :proposal="proposal"
            :currency="listing?.currency"
            @accept="openAcceptModal"
            @reject="openRejectModal"
            @read-more="openCoverLetter"
          />
        </div>
      </div>

      <!-- Other proposals (accepted, rejected, withdrawn) -->
      <div v-if="otherProposals.length > 0">
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Geçmiş Başvurular ({{ otherProposals.length }})
        </h3>
        <div class="space-y-3">
          <ProposalCard
            v-for="proposal in otherProposals"
            :key="proposal.id"
            :proposal="proposal"
            :currency="listing?.currency"
            @accept="openAcceptModal"
            @reject="openRejectModal"
            @read-more="openCoverLetter"
          />
        </div>
      </div>
    </div>

    <!-- Accept Confirmation Modal -->
    <BaseModal :open="showAcceptModal" title="Teklifi Kabul Et" size="md" @close="showAcceptModal = false">
      <div class="space-y-4">
        <div class="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="font-semibold text-green-800 dark:text-green-300">
              {{ selectedProposal?.labeler.displayName || selectedProposal?.labeler.email }}
            </p>
            <p class="text-sm text-green-700 dark:text-green-400">
              Teklif: {{ selectedProposal ? formatPrice(selectedProposal.priceQuote, listing?.currency) : '' }}
            </p>
          </div>
        </div>

        <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div class="flex items-start gap-2">
            <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p class="text-sm text-yellow-800 dark:text-yellow-300">
              Bu teklifi kabul ettiğinizde sözleşme otomatik olarak başlayacak ve diğer bekleyen teklifler reddedilecektir. Bu işlem geri alınamaz.
            </p>
          </div>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" :disabled="proposalsStore.actionLoading" @click="showAcceptModal = false">
          İptal
        </BaseButton>
        <BaseButton
          variant="primary"
          :loading="proposalsStore.actionLoading"
          class="!bg-green-600 hover:!bg-green-700"
          @click="handleAccept"
        >
          Kabul Et ve Sözleşme Oluştur
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Reject Confirmation Modal -->
    <BaseModal :open="showRejectModal" title="Teklifi Reddet" size="sm" @close="showRejectModal = false">
      <p class="text-gray-600 dark:text-gray-400">
        <strong>{{ selectedProposal?.labeler.displayName || selectedProposal?.labeler.email }}</strong> adlı kullanıcının
        teklifini reddetmek istediğinizden emin misiniz?
      </p>
      <template #footer>
        <BaseButton variant="secondary" :disabled="proposalsStore.actionLoading" @click="showRejectModal = false">
          İptal
        </BaseButton>
        <BaseButton
          variant="danger"
          :loading="proposalsStore.actionLoading"
          @click="handleReject"
        >
          Reddet
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Full Cover Letter Modal -->
    <BaseModal :open="showFullCoverLetter" title="Ön Yazı" size="lg" @close="showFullCoverLetter = false">
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span class="text-primary-700 dark:text-primary-300 font-semibold text-xs">
              {{ (selectedProposal?.labeler.displayName || selectedProposal?.labeler.email || 'U').charAt(0).toUpperCase() }}
            </span>
          </div>
          <span class="font-medium text-gray-900 dark:text-white">
            {{ selectedProposal?.labeler.displayName || selectedProposal?.labeler.email }}
          </span>
        </div>
        <div class="prose dark:prose-invert max-w-none">
          <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ selectedProposal?.coverLetter }}</p>
        </div>
      </div>
    </BaseModal>
  </AppLayout>
</template>
