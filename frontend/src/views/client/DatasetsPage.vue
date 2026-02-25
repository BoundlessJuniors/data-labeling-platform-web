<script setup lang="ts">
/**
 * DatasetsPage - Client datasets list with CRUD + image upload on create
 */
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDatasetsStore } from '@/stores/datasets';
import { assetsApi } from '@/api/assets';
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

const router = useRouter();
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

// File upload state
/* global File */
const selectedFiles = ref<File[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Edit modal gallery state
interface GalleryAsset {
  id: string;
  objectKey: string;
  mimeType: string;
  signedUrl?: string;
}
const editGalleryAssets = ref<GalleryAsset[]>([]);
const editGalleryTotal = ref(0);
const editGalleryLoading = ref(false);

// Computed: create button disabled unless name + at least one file
const isCreateDisabled = computed(() => {
  return !formName.value.trim() || selectedFiles.value.length === 0;
});

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
  selectedFiles.value = [];
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
  formName.value = '';
  formDescription.value = '';
  selectedFiles.value = [];
}

async function openEditModal(id: string, name: string, description: string | null) {
  editingId.value = id;
  formName.value = name;
  formDescription.value = description || '';
  editGalleryAssets.value = [];
  editGalleryTotal.value = 0;
  showEditModal.value = true;

  // Fetch gallery preview
  editGalleryLoading.value = true;
  try {
    const res = await assetsApi.list({ datasetId: id, page: 1, limit: 8 });
    editGalleryAssets.value = res.data.data as unknown as GalleryAsset[];
    editGalleryTotal.value = res.data.pagination?.total ?? res.data.data.length;
  } catch {
    // Silently fail — gallery is optional
  } finally {
    editGalleryLoading.value = false;
  }
}

function openDeleteModal(id: string) {
  deletingId.value = id;
  showDeleteModal.value = true;
}

// File selection
function triggerFileSelect() {
  fileInputRef.value?.click();
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const newFiles = Array.from(input.files);
  selectedFiles.value = [...selectedFiles.value, ...newFiles];
  input.value = ''; // reset so same files can be re-selected
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// CRUD handlers
async function handleCreate() {
  if (isCreateDisabled.value) return;
  const result = await datasetsStore.createDatasetWithAssets(
    {
      name: formName.value.trim(),
      description: formDescription.value.trim() || undefined,
    },
    selectedFiles.value,
  );
  if (result) {
    closeCreateModal();
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

function goToDatasetDetail(id: string) {
  router.push({ name: 'client-dataset-detail', params: { id } });
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
        class="card hover:shadow-lg transition-shadow group cursor-pointer"
        @click="goToDatasetDetail(dataset.id)"
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
              class="p-1.5 rounded transition-colors"
              :class="[
                (dataset.listingCount ?? 0) > 0 
                  ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              ]"
              :disabled="(dataset.listingCount ?? 0) > 0"
              :title="(dataset.listingCount ?? 0) > 0 ? 'Bu dataset bir ilanda kullanıldığı için düzenlenemez/silinemez.' : 'Düzenle'"
              aria-label="Düzenle"
              @click.stop="openEditModal(dataset.id, dataset.name, dataset.description)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              class="p-1.5 rounded transition-colors"
              :class="[
                (dataset.listingCount ?? 0) > 0 
                  ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500' 
                  : 'hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400'
              ]"
              :disabled="(dataset.listingCount ?? 0) > 0"
              :title="(dataset.listingCount ?? 0) > 0 ? 'Bu dataset bir ilanda kullanıldığı için düzenlenemez/silinemez.' : 'Sil'"
              aria-label="Sil"
              @click.stop="openDeleteModal(dataset.id)"
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

    <!-- ================================================================ -->
    <!-- Create Modal -->
    <!-- ================================================================ -->
    <BaseModal :open="showCreateModal" title="Yeni Dataset" @close="closeCreateModal">
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

        <!-- File Selection Area -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Görseller <span class="text-red-500">*</span>
          </label>
          <div
            class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
            @click="triggerFileSelect"
          >
            <svg class="mx-auto w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Görsel seçmek için tıklayın
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
              JPEG, PNG, WEBP • Maks. 10 MB/dosya • Maks. 100 dosya
            </p>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="onFilesSelected"
          />

          <!-- Selected Files List -->
          <div v-if="selectedFiles.length > 0" class="mt-3 space-y-2">
            <div class="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
              <span class="font-medium">{{ selectedFiles.length }} dosya seçildi</span>
              <button
                type="button"
                class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                @click="selectedFiles = []"
              >
                Tümünü Kaldır
              </button>
            </div>
            <ul class="max-h-40 overflow-y-auto space-y-1">
              <li
                v-for="(file, index) in selectedFiles"
                :key="index"
                class="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded px-3 py-1.5"
              >
                <span class="truncate mr-2 text-gray-700 dark:text-gray-300">{{ file.name }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-xs text-gray-400">{{ formatFileSize(file.size) }}</span>
                  <button
                    type="button"
                    class="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                    aria-label="Dosyayı kaldır"
                    @click.stop="removeFile(index)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Upload Progress -->
        <div v-if="datasetsStore.uploading" class="space-y-2">
          <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Görseller yükleniyor...</span>
            <span>{{ datasetsStore.uploadProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-primary-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${datasetsStore.uploadProgress}%` }"
            ></div>
          </div>
        </div>
      </form>
      <template #footer>
        <BaseButton variant="secondary" :disabled="datasetsStore.loading || datasetsStore.uploading" @click="closeCreateModal">İptal</BaseButton>
        <BaseButton
          variant="primary"
          :loading="datasetsStore.loading || datasetsStore.uploading"
          :disabled="isCreateDisabled || datasetsStore.loading || datasetsStore.uploading"
          @click="handleCreate"
        >
          Oluştur
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ================================================================ -->
    <!-- Edit Modal with Gallery -->
    <!-- ================================================================ -->
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

        <!-- Mini Gallery -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Yüklü Görseller
              <span v-if="editGalleryTotal > 0" class="text-gray-400 font-normal">({{ editGalleryTotal }})</span>
            </label>
            <button
              v-if="editGalleryTotal > 0 && editingId"
              type="button"
              class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              @click="showEditModal = false; goToDatasetDetail(editingId)"
            >
              Tümünü Gör →
            </button>
          </div>

          <!-- Loading -->
          <div v-if="editGalleryLoading" class="grid grid-cols-4 gap-2">
            <div v-for="i in 4" :key="i" class="aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
          </div>

          <!-- No assets -->
          <div v-else-if="editGalleryAssets.length === 0" class="text-sm text-gray-400 dark:text-gray-500 text-center py-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            Henüz görsel yüklenmemiş
          </div>

          <!-- Thumbnails grid -->
          <div v-else class="grid grid-cols-4 gap-2">
            <div
              v-for="asset in editGalleryAssets"
              :key="asset.id"
              class="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <img
                v-if="asset.mimeType?.startsWith('image/')"
                :src="asset.signedUrl || ''"
                :alt="asset.objectKey"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
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
