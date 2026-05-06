<script setup lang="ts">
/**
 * Admin Invite Requests Page
 * Displays beta registration requests and allows generating invite codes.
 */
import { ref, onMounted } from 'vue';
import { adminApi } from '@/api/admin';
import type { AdminInviteRequestItem } from '@/types/admin';
import { useSeo } from '@/composables/useSeo';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useToastStore } from '@/stores/toast';

useSeo({
  title: 'Invite Requests',
  description: 'Beta kayıt isteklerini görüntüleyin ve davetiye kodları oluşturun.',
});

const toastStore = useToastStore();

const items = ref<AdminInviteRequestItem[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const loading = ref(false);
const error = ref<string | null>(null);

const showCreateModal = ref(false);
const createLoading = ref(false);
const formEmail = ref('');
const formExpiresAt = ref('');
const generatedCode = ref<string | null>(null);

const showRejectModal = ref(false);
const rejectLoading = ref(false);
const rejectTargetId = ref<string | null>(null);

async function fetchRequests(p = page.value) {
  loading.value = true;
  error.value = null;
  try {
    const response = await adminApi.getInviteRequests({ page: p, limit: limit.value });
    items.value = response.data.data;
    total.value = response.data.pagination?.total || response.data.data.length;
    page.value = p;
  } catch (_err) {
    const err = _err as { response?: { data?: { error?: { message?: string } } } };
    error.value = err.response?.data?.error?.message || 'İstekler yüklenirken hata oluştu.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchRequests();
});

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending': return 'badge-warning';
    case 'code_sent': return 'badge-success';
    case 'rejected': return 'badge-neutral';
    default: return 'badge-neutral';
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function openCreateModal(email = '') {
  formEmail.value = email;
  formExpiresAt.value = '';
  generatedCode.value = null;
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
  formEmail.value = '';
  formExpiresAt.value = '';
  generatedCode.value = null;
}

async function handleCreateCode() {
  createLoading.value = true;
  try {
    const payload = {
      email: formEmail.value.trim() || undefined,
      expiresAt: formExpiresAt.value ? new Date(formExpiresAt.value).toISOString() : undefined,
    };
    const response = await adminApi.createInviteCode(payload);
    generatedCode.value = response.data.data.code;
    
    // Refresh the list in the background to update the status to code_sent if applicable
    fetchRequests(page.value);
  } catch (_err) {
    const err = _err as { response?: { data?: { error?: { message?: string } } } };
    const msg = err.response?.data?.error?.message || 'Kod oluşturulurken hata oluştu.';
    toastStore.error(msg);
  } finally {
    createLoading.value = false;
  }
}

async function copyCode() {
  if (!generatedCode.value) return;
  try {
    await window.navigator.clipboard.writeText(generatedCode.value);
    toastStore.success('Kod kopyalandı.');
  } catch (_err) {
    toastStore.error('Kopyalama başarısız oldu.');
  }
}

function openRejectModal(id: string) {
  rejectTargetId.value = id;
  showRejectModal.value = true;
}

function closeRejectModal() {
  showRejectModal.value = false;
  rejectTargetId.value = null;
}

async function handleRejectRequest() {
  if (!rejectTargetId.value) return;
  rejectLoading.value = true;
  try {
    await adminApi.rejectInviteRequest(rejectTargetId.value);
    toastStore.success('Davetiye isteği reddedildi.');
    fetchRequests(page.value);
    closeRejectModal();
  } catch (_err) {
    const err = _err as { response?: { data?: { error?: { message?: string } } } };
    toastStore.error(err.response?.data?.error?.message || 'İstek reddedilirken hata oluştu.');
  } finally {
    rejectLoading.value = false;
  }
}
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Invite Requests</h2>
      <div class="flex items-center gap-3">
        <BaseButton variant="secondary" @click="fetchRequests(page)">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Yenile
        </BaseButton>
        <BaseButton variant="primary" @click="openCreateModal()">
          Yeni Davetiye Kodu
        </BaseButton>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !loading" class="card text-center py-8">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
      <BaseButton variant="secondary" @click="fetchRequests(page)">Tekrar Dene</BaseButton>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading && items.length === 0" class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50/50 dark:bg-[#1f2937]/50 text-gray-500 dark:text-gray-400">
            <tr>
              <th class="px-6 py-4 font-medium">Email</th>
              <th class="px-6 py-4 font-medium">Durum</th>
              <th class="px-6 py-4 font-medium">Oluşturulma</th>
              <th class="px-6 py-4 font-medium">Güncellenme</th>
              <th class="px-6 py-4 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-[#334155]">
            <tr v-for="i in 5" :key="i">
              <td class="px-6 py-4"><BaseSkeleton variant="text" class="w-32" /></td>
              <td class="px-6 py-4"><BaseSkeleton variant="text" class="w-16" /></td>
              <td class="px-6 py-4"><BaseSkeleton variant="text" class="w-24" /></td>
              <td class="px-6 py-4"><BaseSkeleton variant="text" class="w-24" /></td>
              <td class="px-6 py-4"><BaseSkeleton variant="text" class="w-20" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="items.length === 0" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto bg-gray-50 dark:bg-[#1f2937] rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">Davetiye isteği yok</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">Henüz beta programı için kayıt isteği bulunmuyor.</p>
    </div>

    <!-- Data Table -->
    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50/50 dark:bg-[#1f2937]/50 text-gray-500 dark:text-gray-400">
            <tr>
              <th class="px-6 py-4 font-medium">Email</th>
              <th class="px-6 py-4 font-medium">Durum</th>
              <th class="px-6 py-4 font-medium">Oluşturulma</th>
              <th class="px-6 py-4 font-medium">Güncellenme</th>
              <th class="px-6 py-4 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-[#334155]">
            <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50/50 dark:hover:bg-[#1f2937]/50 transition-colors">
              <td class="px-6 py-4">
                <span class="font-medium text-gray-900 dark:text-white">{{ item.email }}</span>
              </td>
              <td class="px-6 py-4">
                <span :class="getStatusBadge(item.status)">{{ item.status }}</span>
              </td>
              <td class="px-6 py-4 text-gray-500 dark:text-gray-400">
                {{ formatDate(item.createdAt) }}
              </td>
              <td class="px-6 py-4 text-gray-500 dark:text-gray-400">
                {{ formatDate(item.updatedAt) }}
              </td>
              <td class="px-6 py-4 text-right space-x-3">
                <button
                  v-if="item.status === 'pending'"
                  type="button"
                  class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                  @click="openCreateModal(item.email)"
                >
                  Kod Oluştur
                </button>
                <button
                  v-if="item.status === 'pending'"
                  type="button"
                  class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                  @click="openRejectModal(item.id)"
                >
                  Reddet
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > limit" class="p-4 border-t border-gray-100 dark:border-[#334155]">
        <BasePagination
          :current-page="page"
          :total-pages="Math.ceil(total / limit)"
          :loading="loading"
          @page-change="fetchRequests"
        />
      </div>
    </div>

    <!-- Create Code Modal -->
    <BaseModal :open="showCreateModal" title="Davetiye Kodu Oluştur" @close="closeCreateModal">
      <div v-if="!generatedCode">
        <form class="space-y-4" @submit.prevent="handleCreateCode">
          <BaseInput
            id="code-email"
            v-model="formEmail"
            type="email"
            label="Kullanıcı Email (Opsiyonel)"
            placeholder="ornek@domain.com"
          />
          <BaseInput
            id="code-expires"
            v-model="formExpiresAt"
            type="datetime-local"
            label="Geçerlilik Tarihi (Opsiyonel)"
          />
        </form>
      </div>
      <div v-else class="text-center py-6">
        <div class="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Davetiye Kodu Oluşturuldu</h3>
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex items-center justify-between gap-4 mb-6">
          <code class="text-lg font-mono text-primary-600 dark:text-primary-400 truncate">{{ generatedCode }}</code>
          <BaseButton variant="secondary" size="sm" @click="copyCode">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Kopyala
          </BaseButton>
        </div>
      </div>
      <template #footer>
        <template v-if="!generatedCode">
          <BaseButton variant="secondary" :disabled="createLoading" @click="closeCreateModal">İptal</BaseButton>
          <BaseButton variant="primary" :loading="createLoading" @click="handleCreateCode">Oluştur</BaseButton>
        </template>
        <template v-else>
          <BaseButton variant="primary" @click="closeCreateModal">Kapat</BaseButton>
        </template>
      </template>
    </BaseModal>

    <!-- Reject Confirmation Modal -->
    <BaseModal :open="showRejectModal" title="İsteği Reddet" @close="closeRejectModal">
      <div class="py-4 text-gray-700 dark:text-gray-300">
        Bu davetiye isteğini reddetmek istediğinizden emin misiniz?
      </div>
      <template #footer>
        <BaseButton variant="secondary" :disabled="rejectLoading" @click="closeRejectModal">İptal</BaseButton>
        <BaseButton class="bg-red-600 hover:bg-red-700 text-white" :loading="rejectLoading" @click="handleRejectRequest">Reddet</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
