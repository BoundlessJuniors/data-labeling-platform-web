<script setup lang="ts">
/**
 * DatasetDetailPage - View dataset with assets grid + upload
 */
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDatasetsStore } from '@/stores/datasets';
import { useAssetsStore } from '@/stores/assets';
import { useSeo } from '@/composables/useSeo';
import { betaLimits } from '@/config/betaLimits';
import { useToastStore } from '@/stores/toast';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';

/** Flexible asset shape covering both upload responses and fetch results */
interface DisplayableAsset {
  id?: string;
  fileName?: string;
  objectKey?: string;
  fileUrl?: string;
  signedUrl?: string | null;
  mimeType?: string;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

const route = useRoute();
const router = useRouter();
const datasetsStore = useDatasetsStore();
const assetsStore = useAssetsStore();
const toastStore = useToastStore();

const datasetId = computed(() => route.params.id as string);

// Upload
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDatasetInUse = computed(() => (datasetsStore.currentDataset?.listingCount ?? 0) > 0);
const isAssetLimitReached = computed(() => assetsStore.total >= betaLimits.datasetMaxAssets);

// Preview modal
const showPreviewModal = ref(false);
const previewAsset = ref<{ url: string; name: string; metadata: Record<string, unknown> | null } | null>(null);

// SEO
useSeo({
  title: 'Dataset Detay',
  description: 'Dataset ve assetleri görüntüleyin.',
});

onMounted(async () => {
  if (datasetId.value) {
    await datasetsStore.fetchDataset(datasetId.value);
    await assetsStore.fetchAssets(datasetId.value);
  }
});

// Upload handlers
function triggerFileSelect() {
  fileInputRef.value?.click();
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const allFiles = Array.from(input.files);

  // 0. MIME type guard (UX layer — backend is the source of truth).
  // Blocks SVG, GIF, AVIF, and any type not on the allowlist even if the
  // browser accept attribute is bypassed.
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const typeValidFiles = allFiles.filter(f => ALLOWED_MIME_TYPES.includes(f.type));
  const typeRejectedCount = allFiles.length - typeValidFiles.length;
  if (typeRejectedCount > 0) {
    toastStore.warning(
      `${typeRejectedCount} dosya desteklenmeyen format nedeniyle reddedildi. Sadece JPEG, PNG ve WEBP kabul edilir.`
    );
  }

  const validFiles = typeValidFiles.filter(file => file.size <= betaLimits.maxFileSizeBytes);
  
  if (validFiles.length < typeValidFiles.length) {
    toastStore.warning(
      `${typeValidFiles.length - validFiles.length} dosya ${betaLimits.maxFileSizeMbLabel} sınırını aştığı için yüklenmedi.`
    );
  }

  const remainingSlots = betaLimits.datasetMaxAssets - assetsStore.total;
  if (remainingSlots <= 0) {
    toastStore.warning(`Beta sürümünde bir dataset'e en fazla ${betaLimits.datasetMaxAssets} görsel eklenebilir. Limit doldu.`);
    input.value = '';
    return;
  }
  
  const filesToAdd = validFiles.slice(0, remainingSlots);
  if (validFiles.length > remainingSlots) {
    toastStore.warning(
      `Beta sürümünde bir dataset'e en fazla ${betaLimits.datasetMaxAssets} görsel eklenebilir. Sadece ${remainingSlots} dosya eklenecek.`
    );
  }

  await assetsStore.uploadAssets(datasetId.value, filesToAdd, { existingAssetCount: assetsStore.total });

  // Reset input so same files can be re-selected
  input.value = '';
}

function openPreview(asset: DisplayableAsset) {
  previewAsset.value = {
    url: asset.signedUrl || asset.fileUrl || '',
    name: asset.fileName || asset.objectKey || asset.id || 'Bilinmeyen Dosya',
    metadata: asset.metadata ?? null,
  };
  showPreviewModal.value = true;
}

function closePreview() {
  showPreviewModal.value = false;
  previewAsset.value = null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ready':
      return 'badge-success';
    case 'processing':
      return 'badge-warning';
    case 'error':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
}

function getAssetDisplayName(asset: DisplayableAsset): string {
  return asset.fileName || asset.objectKey || asset.id || 'Bilinmeyen Dosya';
}

function getAssetImageUrl(asset: DisplayableAsset): string {
  return asset.signedUrl || asset.fileUrl || '';
}

function goBack() {
  router.push({ name: 'client-datasets' });
}

// Selection Mode State
const isSelectionMode = ref(false);
const selectedAssetIds = ref<Set<string>>(new Set());
const showBulkDeleteModal = ref(false);
const deletingAssetId = ref<string | null>(null);

function toggleSelectionMode() {
  isSelectionMode.value = !isSelectionMode.value;
  if (!isSelectionMode.value) {
    selectedAssetIds.value.clear();
  }
}

function toggleSelection(id: string) {
  if (selectedAssetIds.value.has(id)) {
    selectedAssetIds.value.delete(id);
  } else {
    selectedAssetIds.value.add(id);
  }
}

function selectAllAssets() {
  const currentAssetIds = assetsStore.assets.map(a => a.id as string).filter(Boolean);
  const allSelected = currentAssetIds.every(id => selectedAssetIds.value.has(id));

  if (allSelected) {
    currentAssetIds.forEach(id => selectedAssetIds.value.delete(id));
  } else {
    currentAssetIds.forEach(id => selectedAssetIds.value.add(id));
  }
}

function promptDelete(assetId?: string) {
  if (assetId) {
    deletingAssetId.value = assetId;
  }
  showBulkDeleteModal.value = true;
}

function closeDeleteModal() {
  showBulkDeleteModal.value = false;
  deletingAssetId.value = null;
}

async function executeDelete() {
  const idsToDelete = deletingAssetId.value 
    ? [deletingAssetId.value] 
    : Array.from(selectedAssetIds.value);

  if (idsToDelete.length === 0) return;

  const results = await Promise.allSettled(
    idsToDelete.map(id => assetsStore.deleteAsset(id))
  );

  const succeededCount = results.filter(r => r.status === 'fulfilled').length;
  // Let the store handle its own toasts, but maybe log or alert summary
  if (succeededCount > 0) {
    await assetsStore.fetchAssets(datasetId.value);
  }

  isSelectionMode.value = false;
  selectedAssetIds.value.clear();
  closeDeleteModal();
}
</script>

<template>
  <AppLayout>
    <template #header>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Geri"
          @click="goBack"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span>{{ datasetsStore.currentDataset?.name || 'Dataset Detay' }}</span>
      </div>
    </template>

    <!-- Dataset Info -->
    <div v-if="datasetsStore.currentDataset" class="card mb-6">
      <div class="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ datasetsStore.currentDataset.name }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            {{ datasetsStore.currentDataset.description || 'Açıklama yok' }}
          </p>
        </div>
        
        <!-- Action Bar: Selection Mode -->
        <div v-if="isSelectionMode" class="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
            {{ selectedAssetIds.size }} görsel seçildi
          </span>
          <BaseButton variant="secondary" size="sm" @click="selectAllAssets">
            Tümünü Seç
          </BaseButton>
          <BaseButton variant="secondary" size="sm" @click="toggleSelectionMode">
            İptal
          </BaseButton>
          <BaseButton 
            variant="danger" 
            size="sm" 
            :disabled="selectedAssetIds.size === 0"
            @click="promptDelete()"
          >
            Seçilenleri Sil
          </BaseButton>
        </div>

        <!-- Action Bar: Normal Mode -->
        <div v-else class="flex items-center gap-3">
          <span :class="getStatusBadge(datasetsStore.currentDataset.status)">
            {{ datasetsStore.currentDataset.status }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ assetsStore.total }} / {{ betaLimits.datasetMaxAssets }} asset &bull; Maks. {{ betaLimits.maxFileSizeMbLabel }}/dosya
          </span>
          
          <!-- Select Mode Toggle Button -->
          <BaseButton
            v-if="!isDatasetInUse && assetsStore.assets.length > 0"
            variant="secondary"
            :disabled="assetsStore.uploading"
            @click="toggleSelectionMode"
          >
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Seç
          </BaseButton>

          <!-- Upload Button -->
          <BaseButton
            variant="primary"
            :loading="assetsStore.uploading"
            :disabled="assetsStore.uploading || isDatasetInUse || isAssetLimitReached"
            :title="isDatasetInUse ? 'Bu dataset bir ilanda kullanıldığı için yeni görsel eklenemez.' : (isAssetLimitReached ? 'Beta maksimum görsel limitine ulaşıldı.' : 'Görsel Yükle')"
            @click="triggerFileSelect"
          >
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Görsel Yükle
          </BaseButton>
          <!-- Hidden file input -->
          <input
            ref="fileInputRef"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="onFilesSelected"
          />
        </div>
      </div>
    </div>

    <!-- Upload Progress Bar -->
    <div v-if="assetsStore.uploading" class="card mb-4">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Yükleniyor...</span>
            <span>{{ assetsStore.uploadProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              class="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
              :style="{ width: `${assetsStore.uploadProgress}%` }"
            ></div>
          </div>
        </div>
        <svg class="w-6 h-6 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="assetsStore.loading && assetsStore.assets.length === 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div v-for="i in 12" :key="i" class="aspect-square">
        <BaseSkeleton variant="rectangular" class="w-full h-full rounded-lg" />
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="assetsStore.error" class="card text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ assetsStore.error }}</p>
      <BaseButton variant="secondary" @click="assetsStore.fetchAssets(datasetId)">
        Tekrar Dene
      </BaseButton>
    </div>

    <!-- Empty state -->
    <BaseEmptyState
      v-else-if="assetsStore.assets.length === 0 && !assetsStore.loading"
      icon="database"
      title="Henüz asset yok"
      description="Bu dataset'e henüz asset eklenmemiş. 'Görsel Yükle' butonunu kullanarak görsel yükleyebilirsiniz."
    >
      <template #action>
        <BaseButton 
          variant="primary" 
          :disabled="isDatasetInUse || isAssetLimitReached"
          :title="isDatasetInUse ? 'Bu dataset bir ilanda kullanıldığı için yeni görsel eklenemez.' : (isAssetLimitReached ? 'Beta maksimum görsel limitine ulaşıldı.' : '')"
          @click="triggerFileSelect"
        >
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          İlk Görseli Yükle
        </BaseButton>
      </template>
    </BaseEmptyState>

    <!-- Assets grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <button
        v-for="asset in assetsStore.assets"
        :key="asset.id"
        type="button"
        class="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        :class="[
          isSelectionMode && selectedAssetIds.has(asset.id as string) 
            ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900' 
            : 'border-transparent hover:border-primary-500'
        ]"
        @click="isSelectionMode ? toggleSelection(asset.id as string) : openPreview(asset)"
      >
        <!-- Thumbnail -->
        <img
          v-if="asset.mimeType?.startsWith('image/')"
          :src="getAssetImageUrl(asset)"
          :alt="getAssetDisplayName(asset)"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <!-- File icon for non-images -->
        <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>

        <!-- Selection Checkbox (Visible in Selection Mode or when selected) -->
        <div 
          v-if="isSelectionMode || selectedAssetIds.has(asset.id as string)"
          class="absolute top-2 left-2 w-6 h-6 rounded-md border flex items-center justify-center transition-colors shadow-sm z-10"
          :class="[
            selectedAssetIds.has(asset.id as string)
              ? 'bg-primary-600 border-primary-600 text-white'
              : 'bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-500 text-transparent'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <!-- Individual Delete Button (Visible on hover in normal mode) -->
        <div 
          v-if="!isSelectionMode"
          class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <button
            type="button"
            class="p-1.5 rounded-md bg-white/90 dark:bg-gray-800/90 text-red-600 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isDatasetInUse"
            :title="isDatasetInUse ? 'Bu dataset kullanımda olduğu için silinemez.' : 'Sil'"
            @click.stop="promptDelete(asset.id as string)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <div class="text-white text-xs truncate w-full pr-1">
            {{ getAssetDisplayName(asset) }}
          </div>
        </div>
      </button>
    </div>

    <!-- Pagination -->
    <BasePagination
      :current-page="assetsStore.page"
      :total-pages="assetsStore.totalPages"
      :loading="assetsStore.loading"
      class="mt-6"
      @page-change="assetsStore.goToPage"
    />

    <!-- Preview Modal -->
    <BaseModal :open="showPreviewModal" :title="previewAsset?.name || 'Asset'" size="lg" @close="closePreview">
      <div v-if="previewAsset" class="space-y-4">
        <!-- Image preview -->
        <div class="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
          <img
            :src="previewAsset.url"
            :alt="previewAsset.name"
            class="max-w-full max-h-[60vh] object-contain"
          />
        </div>
        <!-- Metadata -->
        <div v-if="previewAsset.metadata && Object.keys(previewAsset.metadata).length > 0">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Metadata</h3>
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <template v-for="(value, key) in previewAsset.metadata" :key="key">
              <dt class="text-gray-500 dark:text-gray-400">{{ key }}</dt>
              <dd class="text-gray-900 dark:text-white">{{ value }}</dd>
            </template>
          </dl>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="closePreview">Kapat</BaseButton>
      </template>
    </BaseModal>

    <!-- Bulk / Single Delete Modal -->
    <BaseModal 
      :open="showBulkDeleteModal" 
      :title="deletingAssetId ? 'Görseli Sil' : 'Seçilen Görselleri Sil'" 
      size="sm" 
      @close="closeDeleteModal"
    >
      <div class="p-1">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          <template v-if="deletingAssetId">
            Bu görseli silmek istediğinize emin misiniz?
          </template>
          <template v-else>
            Seçilen <strong>{{ selectedAssetIds.size }}</strong> görseli silmek istediğinize emin misiniz?
          </template>
        </p>
        <p class="text-xs text-red-600 dark:text-red-400 mt-2">
          Bu işlem geri alınamaz.
        </p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" :disabled="assetsStore.loading" @click="closeDeleteModal">İptal</BaseButton>
        <BaseButton variant="danger" :loading="assetsStore.loading" @click="executeDelete">
          Sil
        </BaseButton>
      </template>
    </BaseModal>
  </AppLayout>
</template>
