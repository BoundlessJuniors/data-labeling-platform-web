<script setup lang="ts">
/**
 * UsersPage - Admin user management with search and role editing
 */
import { ref, onMounted, watch, computed } from 'vue';
import { useSeo } from '@/composables/useSeo';
import { useToastStore } from '@/stores/toast';
import apiClient from '@/api/client';
import AppLayout from '@/layouts/AppLayout.vue';
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

interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: 'client' | 'labeler' | 'admin';
  isActive: boolean;
  createdAt: string;
  _count?: {
    datasets: number;
    listingsOwned: number;
    contractsAsLabeler: number;
  };
}

// State
const users = ref<User[]>([]);
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
const editingUser = ref<User | null>(null);
const editRole = ref('');
const editIsActive = ref(true);
const editLoading = ref(false);

// Role options
const roleOptions = [
  { value: '', label: 'Tüm Roller' },
  { value: 'client', label: 'Client' },
  { value: 'labeler', label: 'Labeler' },
  { value: 'admin', label: 'Admin' },
];

async function fetchUsers() {
  loading.value = true;
  error.value = null;

  try {
    const response = await apiClient.get('/admin/users', {
      params: {
        page: page.value,
        limit: limit.value,
        search: searchInput.value || undefined,
        role: roleFilter.value || undefined,
      },
    });

    users.value = response.data.data;
    total.value = response.data.pagination?.total ?? response.data.data.length;
  } catch (_err) {
    error.value = 'Kullanıcılar yüklenemedi';
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

function openEditModal(user: User) {
  editingUser.value = user;
  editRole.value = user.role;
  editIsActive.value = user.isActive ?? true;
  showEditModal.value = true;
}

async function saveUser() {
  if (!editingUser.value) return;

  editLoading.value = true;
  try {
    await apiClient.patch(`/admin/users/${editingUser.value.id}`, {
      role: editRole.value,
      isActive: editIsActive.value,
    });
    toastStore.success('Kullanıcı güncellendi');
    showEditModal.value = false;
    editingUser.value = null;
    fetchUsers();
  } catch (_err) {
    toastStore.error('Kullanıcı güncellenemedi');
  } finally {
    editLoading.value = false;
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
  <AppLayout>
    <template #header>Kullanıcı Yönetimi</template>

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
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Durum</th>
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
            <td class="px-4 py-3 whitespace-nowrap">
              <span :class="user.isActive ? 'badge-success' : 'badge-error'">
                {{ user.isActive ? 'Aktif' : 'Pasif' }}
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
              {{ formatDate(user.createdAt) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-right">
              <button
                type="button"
                class="text-primary-600 hover:text-primary-700 text-sm font-medium"
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
        <div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="editIsActive"
              type="checkbox"
              class="w-4 h-4 text-primary-600 rounded"
            />
            <span class="text-sm text-gray-900 dark:text-white">Aktif</span>
          </label>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">İptal</BaseButton>
        <BaseButton variant="primary" :loading="editLoading" @click="saveUser">Kaydet</BaseButton>
      </template>
    </BaseModal>
  </AppLayout>
</template>
