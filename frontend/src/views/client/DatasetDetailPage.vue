<script setup lang="ts">
/**
 * DatasetDetailPage - View dataset with assets grid + upload
 */
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDatasetsStore } from '@/stores/datasets';
import { useAssetsStore } from '@/stores/assets';
import { useSeo } from '@/composables/useSeo';
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
  signedUrl?: string;
  mimeType?: string;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

const route = useRoute();
const router = useRouter();
const datasetsStore = useDatasetsStore();
const assetsStore = useAssetsStore();

const datasetId = computed(() => route.params.id as string);

// Upload
const fileInputRef = ref<HTMLInputElement | null>(null);

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

  const files = Array.from(input.files);
  await assetsStore.uploadAssets(datasetId.value, files);

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
        <div class="flex items-center gap-3">
          <span :class="getStatusBadge(datasetsStore.currentDataset.status)">
            {{ datasetsStore.currentDataset.status }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ assetsStore.total }} asset
          </span>
          <!-- Upload Button -->
          <BaseButton
            variant="primary"
            :loading="assetsStore.uploading"
            :disabled="assetsStore.uploading"
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
        <BaseButton variant="primary" @click="triggerFileSelect">
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
        class="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-transparent hover:border-primary-500 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        @click="openPreview(asset)"
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
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <div class="text-white text-xs truncate w-full">
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
  </AppLayout>
</template>
