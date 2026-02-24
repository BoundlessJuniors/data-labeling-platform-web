<script setup lang="ts">
/**
 * MyProposalsPage - Labeler's proposal tracking page
 */
import { ref, onMounted, computed } from 'vue';
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
  title: 'Başvurularım',
  description: 'Gönderdiğiniz iş başvurularını takip edin.',
});

const toastStore = useToastStore();

interface MyProposal {
  id: string;
  listingTitle: string;
  priceQuote: number;
  currency: string;
  status: string;
  createdAt: string;
}

// State
const proposals = ref<MyProposal[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref(1);
const total = ref(0);
const limit = ref(10);
const totalPages = computed(() => Math.ceil(total.value / limit.value));

// Withdraw modal
const showWithdrawModal = ref(false);
const withdrawingProposal = ref<MyProposal | null>(null);
const withdrawLoading = ref(false);

async function fetchProposals() {
  loading.value = true;
  error.value = null;

  try {
    const response = await apiClient.get('/proposals', {
      params: { page: page.value, limit: limit.value },
    });

    // Map nested backend response to flat shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proposals.value = (response.data.data as Record<string, any>[]).map((item) => ({
      id: item.id,
      listingTitle: item.listing?.title ?? 'İlan',
      priceQuote: item.priceQuote,
      currency: item.listing?.currency ?? 'TRY',
      status: item.status,
      createdAt: item.createdAt,
    }));
    total.value = response.data.pagination?.total ?? response.data.data.length;
  } catch (_err) {
    error.value = 'Başvurular yüklenemedi';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchProposals);

function goToPage(newPage: number) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
    fetchProposals();
  }
}

function openWithdrawModal(proposal: MyProposal) {
  withdrawingProposal.value = proposal;
  showWithdrawModal.value = true;
}

async function handleWithdraw() {
  if (!withdrawingProposal.value) return;

  withdrawLoading.value = true;
  try {
    await apiClient.patch(`/proposals/${withdrawingProposal.value.id}/withdraw`);
    toastStore.success('Başvurunuz geri çekildi.');
    showWithdrawModal.value = false;
    withdrawingProposal.value = null;
    fetchProposals();
  } catch (_err) {
    toastStore.error('Başvuru geri çekilemedi.');
  } finally {
    withdrawLoading.value = false;
  }
}

function getStatusBadge(status: string) {
  const badges: Record<string, string> = {
    pending: 'badge-warning',
    accepted: 'badge-success',
    rejected: 'badge-error',
    withdrawn: 'badge-neutral',
  };
  return badges[status] || 'badge-neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Beklemede',
    accepted: 'Kabul Edildi',
    rejected: 'Reddedildi',
    withdrawn: 'Geri Çekildi',
  };
  return labels[status] || status;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
</script>

<template>
  <AppLayout>
    <template #header>Başvurularım</template>

    <!-- Loading -->
    <div v-if="loading && proposals.length === 0" class="space-y-4">
      <div v-for="i in 4" :key="i" class="card">
        <BaseSkeleton variant="text" class="w-1/3 mb-2" />
        <BaseSkeleton variant="text" class="w-1/2 mb-2" />
        <BaseSkeleton variant="text" class="w-1/4" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
      <BaseButton variant="secondary" @click="fetchProposals">Tekrar Dene</BaseButton>
    </div>

    <!-- Empty -->
    <BaseEmptyState
      v-else-if="proposals.length === 0"
      icon="database"
      title="Henüz başvuru yok"
      description="İlanlara başvurduğunuzda burada görünecektir."
    >
      <template #action>
        <BaseButton variant="primary" @click="$router.push({ name: 'labeler-listings' })">
          İlanları Gör
        </BaseButton>
      </template>
    </BaseEmptyState>

    <!-- List -->
    <div v-else class="space-y-4">
      <article
        v-for="proposal in proposals"
        :key="proposal.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex flex-col sm:flex-row justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h2 class="font-semibold text-gray-900 dark:text-white truncate">
                {{ proposal.listingTitle }}
              </h2>
              <span :class="getStatusBadge(proposal.status)">{{ getStatusLabel(proposal.status) }}</span>
            </div>
            <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span>Teklif: {{ formatPrice(proposal.priceQuote, proposal.currency) }}</span>
              <span>{{ formatDate(proposal.createdAt) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <BaseButton
              v-if="proposal.status === 'pending'"
              variant="secondary"
              size="sm"
              @click="openWithdrawModal(proposal)"
            >
              Geri Çek
            </BaseButton>
            <span
              v-if="proposal.status === 'accepted'"
              class="text-sm text-green-600 dark:text-green-400 font-medium"
            >
              ✓ Sözleşme oluşturuldu
            </span>
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

    <!-- Withdraw Modal -->
    <BaseModal :open="showWithdrawModal" title="Başvuruyu Geri Çek" size="sm" @close="showWithdrawModal = false">
      <p class="text-gray-600 dark:text-gray-400">
        <strong>{{ withdrawingProposal?.listingTitle }}</strong> ilanına yaptığınız başvuruyu geri çekmek istediğinizden emin misiniz?
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showWithdrawModal = false">İptal</BaseButton>
        <BaseButton variant="danger" :loading="withdrawLoading" @click="handleWithdraw">
          Geri Çek
        </BaseButton>
      </template>
    </BaseModal>
  </AppLayout>
</template>
