<script setup lang="ts">
/**
 * UsersPage - Admin user management with search and role editing
 * Rendered inside AdminLayout — no AppLayout wrapper.
 * isActive removed: User model has no isActive field.
 */
import { ref, onMounted, watch, computed } from 'vue';
import { useSeo } from '@/composables/useSeo';
import { useToastStore } from '@/stores/toast';
import { adminApi } from '@/api/admin';
import type { AdminUserListItem, AdminUserDetail } from '@/types/admin';
import { getErrorMessage } from '@/types/api';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';

useSeo({
  title: 'Kullanıcı Yönetimi',
  description: 'Platform kullanıcılarını yönetin.',
});

const toastStore = useToastStore();

// State
const users = ref<AdminUserListItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref(1);
const total = ref(0);
const limit = ref(20);
const totalPages = computed(() => Math.ceil(total.value / limit.value));

// Search & Filter
const searchInput = ref('');
const roleFilter = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

// Edit modal
const showEditModal = ref(false);
const editingUser = ref<AdminUserListItem | null>(null);
const editRole = ref('');
const editLoading = ref(false);

// Role options
const roleOptions = [
  { value: '', label: 'Tüm Roller' },
  { value: 'client', label: 'Client' },
  { value: 'labeler', label: 'Labeler' },
  { value: 'admin', label: 'Admin' },
];

// Detail modal
const showDetailModal = ref(false);
const detailUser = ref<AdminUserDetail | null>(null);
const detailLoading = ref(false);

async function fetchUsers() {
  loading.value = true;
  error.value = null;

  try {
    const response = await adminApi.getUsers({
      page: page.value,
      limit: limit.value,
      search: searchInput.value || undefined,
      role: roleFilter.value || undefined,
    });

    users.value = response.data.data;
    total.value = response.data.pagination?.total ?? response.data.data.length;
  } catch (_err) {
    error.value = 'Kullanıcılar yüklenemedi. Sunucu bağlantısını kontrol edin.';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchUsers);

watch([searchInput, roleFilter], () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    fetchUsers();
  }, 300);
});

function goToPage(newPage: number) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
    fetchUsers();
  }
}

function openEditModal(user: AdminUserListItem) {
  editingUser.value = user;
  editRole.value = user.role;
  showEditModal.value = true;
}

async function saveUser() {
  if (!editingUser.value) return;

  editLoading.value = true;
  try {
    await adminApi.updateUser(editingUser.value.id, {
      role: editRole.value,
    });
    toastStore.success('Kullanıcı rolü güncellendi');
    showEditModal.value = false;
    editingUser.value = null;
    fetchUsers();
  } catch (_err) {
    toastStore.error('Kullanıcı güncellenemedi. Lütfen tekrar deneyin.');
  } finally {
    editLoading.value = false;
  }
}

async function openDetailModal(user: AdminUserListItem) {
  // Reset and open modal immediately to show loading state
  detailUser.value = null;
  detailLoading.value = true;
  showDetailModal.value = true;
  try {
    const res = await adminApi.getUserById(user.id);
    detailUser.value = res.data.data;
  } catch (err: unknown) {
    toastStore.error(getErrorMessage(err, 'Kullanıcı detayları yüklenemedi'));
    showDetailModal.value = false;
  } finally {
    detailLoading.value = false;
  }
}

function getRoleBadge(role: string) {
  const badges: Record<string, string> = {
    admin: 'badge-error',
    client: 'badge-info',
    labeler: 'badge-success',
  };
  return badges[role] || 'badge-neutral';
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: 'Admin',
    client: 'Client',
    labeler: 'Labeler',
  };
  return labels[role] || role;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR');
}
</script>

<template>
  <!-- Toolbar -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <!-- Search -->
      <div class="relative flex-1 sm:w-64">
        <input
          v-model="searchInput"
          type="search"
          placeholder="Email veya isim ara..."
          class="input pl-10"
          aria-label="Kullanıcı ara"
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
      <!-- Role Filter -->
      <BaseSelect
        id="role-filter"
        v-model="roleFilter"
        :options="roleOptions"
        class="sm:w-40"
        aria-label="Rol filtrele"
      />
    </div>
    <span class="text-sm text-gray-500 dark:text-gray-400">{{ total }} kullanıcı</span>
  </div>

  <!-- Loading -->
  <div v-if="loading && users.length === 0" class="space-y-2">
    <div v-for="i in 8" :key="i" class="card py-3">
      <div class="flex justify-between items-center">
        <BaseSkeleton variant="text" class="w-1/4" />
        <BaseSkeleton variant="rectangular" class="w-16 h-6" />
      </div>
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="card text-center py-12">
    <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
    <BaseButton variant="secondary" @click="fetchUsers">Tekrar Dene</BaseButton>
  </div>

  <!-- Empty -->
  <BaseEmptyState
    v-else-if="users.length === 0"
    :icon="searchInput || roleFilter ? 'search' : 'database'"
    :title="searchInput || roleFilter ? 'Sonuç bulunamadı' : 'Henüz kullanıcı yok'"
    description="Arama kriterlerinizi değiştirin."
  />

  <!-- Table -->
  <div v-else class="card overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead>
        <tr>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kullanıcı</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kayıt</th>
          <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">İşlem</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
        <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
          <td class="px-4 py-3 whitespace-nowrap">
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ user.displayName || 'İsimsiz' }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ user.email }}</div>
            </div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span :class="getRoleBadge(user.role)">{{ getRoleLabel(user.role) }}</span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(user.createdAt) }}
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-right space-x-2">
            <button
              type="button"
              class="text-blue-600 hover:text-blue-700 text-sm font-medium"
              @click="openDetailModal(user)"
            >
              İncele
            </button>
            <button
              type="button"
              class="text-primary-600 hover:text-primary-700 text-sm font-medium border-l border-gray-300 pl-2"
              @click="openEditModal(user)"
            >
              Düzenle
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <BasePagination
    :current-page="page"
    :total-pages="totalPages"
    :loading="loading"
    class="mt-6"
    @page-change="goToPage"
  />

  <!-- Edit Modal -->
  <BaseModal :open="showEditModal" title="Kullanıcı Düzenle" size="sm" @close="showEditModal = false">
    <div v-if="editingUser" class="space-y-4">
      <div>
        <p class="text-sm font-medium text-gray-900 dark:text-white">{{ editingUser.displayName || 'İsimsiz' }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ editingUser.email }}</p>
      </div>
      <BaseSelect
        id="edit-role"
        v-model="editRole"
        label="Rol"
        :options="[
          { value: 'client', label: 'Client' },
          { value: 'labeler', label: 'Labeler' },
          { value: 'admin', label: 'Admin' },
        ]"
      />
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="showEditModal = false">İptal</BaseButton>
      <BaseButton variant="primary" :loading="editLoading" @click="saveUser">Kaydet</BaseButton>
    </template>
  </BaseModal>

  <!-- Detail Modal -->
  <BaseModal :open="showDetailModal" title="Kullanıcı İnceleme Detayları" size="lg" @close="showDetailModal = false">
    <div v-if="detailLoading" class="py-8 text-center text-slate-500 text-sm">Yükleniyor...</div>
    <div v-else-if="detailUser" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
          <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Temel Bilgiler</p>
          <p class="font-medium text-sm mt-1">İsim: {{ detailUser.displayName || 'Yok' }}</p>
          <p class="font-medium text-sm">Email: {{ detailUser.email }}</p>
          <p class="font-medium text-sm">Rol: <span class="capitalize">{{ detailUser.role }}</span></p>
          <p class="font-medium text-sm">Kayıt: {{ formatDate(detailUser.createdAt) }}</p>
          <p class="font-medium text-sm">Puan: {{ detailUser.ratingAvg ? `${detailUser.ratingAvg} (${detailUser.ratingCount || 0})` : 'Yok' }}</p>
        </div>

        <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
          <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">İlişki Sayıları</p>
          <p class="font-medium text-sm mt-1">Datasets: {{ detailUser._count?.datasets ?? 0 }}</p>
          <p class="font-medium text-sm">Listings: {{ detailUser._count?.listingsOwned ?? 0 }}</p>
          <p class="font-medium text-sm">Contracts (Client): {{ detailUser._count?.contractsAsClient ?? 0 }}</p>
          <p class="font-medium text-sm">Contracts (Labeler): {{ detailUser._count?.contractsAsLabeler ?? 0 }}</p>
          <p class="font-medium text-sm">Task Leases: {{ detailUser._count?.taskLeases ?? 0 }}</p>
          <p class="font-medium text-sm">Reviews: {{ detailUser._count?.reviews ?? 0 }}</p>
        </div>
      </div>

      <!-- Recent interactions snippet if necessary -->
      <div v-if="detailUser.auditLogs?.length" class="mt-4">
        <h4 class="text-sm font-semibold mb-2 dark:text-slate-200">Son 5 Admin Aktivitesi (Audit Logs)</h4>
        <ul class="text-xs space-y-1">
          <li v-for="log in detailUser.auditLogs" :key="log.id" class="flex justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1">
            <span class="font-mono text-blue-600 dark:text-blue-400">{{ log.action }}</span>
            <span class="text-slate-500 dark:text-slate-400">{{ formatDate(log.createdAt) }}</span>
          </li>
        </ul>
      </div>
      <div v-if="detailUser.proposals?.length" class="mt-4">
        <h4 class="text-sm font-semibold mb-2 dark:text-slate-200">Son 5 Teklif (Proposals)</h4>
        <ul class="text-xs space-y-1">
          <li v-for="p in detailUser.proposals" :key="p.id" class="flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1">
            <div class="flex justify-between">
              <span class="font-mono dark:text-slate-300">{{ p.status }}</span>
              <span class="text-slate-500 dark:text-slate-400">{{ p.priceQuote }}</span>
            </div>
            <span class="text-slate-400 dark:text-slate-500 mt-1 line-clamp-1 border-t border-slate-100 dark:border-slate-700 pt-1">{{ formatDate(p.createdAt) }}</span>
          </li>
        </ul>
      </div>
    </div>
    <template #footer>
      <BaseButton variant="outline" @click="showDetailModal = false">Kapat</BaseButton>
    </template>
  </BaseModal>
</template>
