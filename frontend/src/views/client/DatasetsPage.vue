<script setup lang="ts">
/**
 * DatasetsPage - Client datasets list with CRUD
 */
import { ref, onMounted, watch } from 'vue';
import { useDatasetsStore } from '@/stores/datasets';
import { useSeo } from '@/composables/useSeo';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';

useSeo({
  title: 'Datasetler',
  description: 'Veri etiketleme projeleriniz için datasetlerinizi yönetin.',
});

const datasetsStore = useDatasetsStore();

// Modal state
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);

// Form state
const formName = ref('');
const formDescription = ref('');
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);

// Search
const searchInput = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

// Fetch on mount
onMounted(() => {
  datasetsStore.fetchDatasets();
});

// Debounced search
watch(searchInput, (value) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    datasetsStore.setSearch(value);
  }, 300);
});

// Modal handlers
function openCreateModal() {
  formName.value = '';
  formDescription.value = '';
  showCreateModal.value = true;
}

function openEditModal(id: string, name: string, description: string | null) {
  editingId.value = id;
  formName.value = name;
  formDescription.value = description || '';
  showEditModal.value = true;
}

function openDeleteModal(id: string) {
  deletingId.value = id;
  showDeleteModal.value = true;
}

async function handleCreate() {
  if (!formName.value.trim()) return;
  const result = await datasetsStore.createDataset({
    name: formName.value.trim(),
    description: formDescription.value.trim() || undefined,
  });
  if (result) {
    showCreateModal.value = false;
  }
}

async function handleUpdate() {
  if (!editingId.value || !formName.value.trim()) return;
  const result = await datasetsStore.updateDataset(editingId.value, {
    name: formName.value.trim(),
    description: formDescription.value.trim() || undefined,
  });
  if (result) {
    showEditModal.value = false;
    editingId.value = null;
  }
}

async function handleDelete() {
  if (!deletingId.value) return;
  const result = await datasetsStore.deleteDataset(deletingId.value);
  if (result) {
    showDeleteModal.value = false;
    deletingId.value = null;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ready':
      return 'badge-success';
    case 'uploading':
      return 'badge-warning';
    case 'draft':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR');
}
</script>

<template>
  <AppLayout>
    <template #header>Datasetler</template>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div class="relative w-full sm:w-80">
        <input
          v-model="searchInput"
          type="search"
          placeholder="Dataset ara..."
          class="input pl-10"
          aria-label="Dataset ara"
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
      <BaseButton variant="primary" @click="openCreateModal">
        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Yeni Dataset
      </BaseButton>
    </div>

    <!-- Loading state -->
    <div v-if="datasetsStore.loading && datasetsStore.datasets.length === 0" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="card">
        <BaseSkeleton variant="text" class="w-2/3 mb-2" />
        <BaseSkeleton variant="text" class="w-full mb-2" />
        <BaseSkeleton variant="text" class="w-1/2" />
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="datasetsStore.error && datasetsStore.datasets.length === 0" class="card text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ datasetsStore.error }}</p>
      <BaseButton variant="secondary" @click="datasetsStore.fetchDatasets()">
        Tekrar Dene
      </BaseButton>
    </div>

    <!-- Empty state -->
    <BaseEmptyState
      v-else-if="datasetsStore.datasets.length === 0 && !datasetsStore.loading"
      :icon="searchInput ? 'search' : 'database'"
      :title="searchInput ? 'Sonuç bulunamadı' : 'Henüz dataset yok'"
      :description="searchInput ? 'Arama kriterlerinizi değiştirin.' : 'İlk datasetinizi oluşturarak başlayın.'"
    >
      <template v-if="!searchInput" #action>
        <BaseButton variant="primary" @click="openCreateModal">
          Yeni Dataset Oluştur
        </BaseButton>
      </template>
    </BaseEmptyState>

    <!-- Datasets grid -->
    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <article
        v-for="dataset in datasetsStore.datasets"
        :key="dataset.id"
        class="card hover:shadow-lg transition-shadow group"
      >
        <div class="flex justify-between items-start mb-3">
          <h2 class="font-semibold text-gray-900 dark:text-white">{{ dataset.name }}</h2>
          <span :class="getStatusBadge(dataset.status)">{{ dataset.status }}</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 truncate-2">
          {{ dataset.description || 'Açıklama yok' }}
        </p>
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{{ dataset.assetCount ?? 0 }} asset • {{ formatDate(dataset.createdAt) }}</span>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Düzenle"
              @click="openEditModal(dataset.id, dataset.name, dataset.description)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
              aria-label="Sil"
              @click="openDeleteModal(dataset.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Pagination -->
    <BasePagination
      :current-page="datasetsStore.page"
      :total-pages="datasetsStore.totalPages"
      :loading="datasetsStore.loading"
      class="mt-6"
      @page-change="datasetsStore.goToPage"
    />

    <!-- Create Modal -->
    <BaseModal :open="showCreateModal" title="Yeni Dataset" @close="showCreateModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <BaseInput
          id="create-name"
          v-model="formName"
          label="İsim"
          placeholder="Dataset ismi"
          required
        />
        <div>
          <label for="create-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Açıklama (Opsiyonel)
          </label>
          <textarea
            id="create-description"
            v-model="formDescription"
            class="input"
            rows="3"
            placeholder="Dataset açıklaması..."
          ></textarea>
        </div>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">İptal</BaseButton>
        <BaseButton variant="primary" :loading="datasetsStore.loading" @click="handleCreate">
          Oluştur
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Edit Modal -->
    <BaseModal :open="showEditModal" title="Dataset Düzenle" @close="showEditModal = false">
      <form class="space-y-4" @submit.prevent="handleUpdate">
        <BaseInput
          id="edit-name"
          v-model="formName"
          label="İsim"
          placeholder="Dataset ismi"
          required
        />
        <div>
          <label for="edit-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Açıklama
          </label>
          <textarea
            id="edit-description"
            v-model="formDescription"
            class="input"
            rows="3"
            placeholder="Dataset açıklaması..."
          ></textarea>
        </div>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">İptal</BaseButton>
        <BaseButton variant="primary" :loading="datasetsStore.loading" @click="handleUpdate">
          Kaydet
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Delete Confirmation Modal -->
    <BaseModal :open="showDeleteModal" title="Dataset Sil" size="sm" @close="showDeleteModal = false">
      <p class="text-gray-600 dark:text-gray-400">
        Bu dataseti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">İptal</BaseButton>
        <BaseButton variant="danger" :loading="datasetsStore.loading" @click="handleDelete">
          Sil
        </BaseButton>
      </template>
    </BaseModal>
  </AppLayout>
</template>
