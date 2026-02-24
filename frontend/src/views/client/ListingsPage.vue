<script setup lang="ts">
/**
 * ListingsPage - Client listings list with CRUD and status actions
 */
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useListingsStore } from '@/stores/listings';
import { useDatasetsStore } from '@/stores/datasets';
import { useLabelSetsStore } from '@/stores/labelsets';
import { useSeo } from '@/composables/useSeo';
import type { ListingStatus, AnnotationFormat } from '@/types/listing';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';

useSeo({
  title: 'İlanlar',
  description: 'Veri etiketleme iş ilanlarınızı yönetin.',
});

const listingsStore = useListingsStore();
const datasetsStore = useDatasetsStore();
const labelSetsStore = useLabelSetsStore();
const router = useRouter();

// Modal state
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);

// Form state
const formTitle = ref('');
const formDescription = ref('');
const formDatasetId = ref('');
const formLabelSetId = ref('');
const formPriceTotal = ref(0);
const formAnnotationFormat = ref<AnnotationFormat>('COCO');
const formInstructions = ref('');
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);

// Edit form state
const editTitle = ref('');
const editDescription = ref('');
const editPriceTotal = ref(0);
const editInstructions = ref('');
const editDatasetName = ref('');

// Search & Filter
const searchInput = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

// Status filter options
const statusOptions = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'open', label: 'Açık' },
  { value: 'draft', label: 'Taslak' },
  { value: 'published', label: 'Yayında' },
  { value: 'closed', label: 'Kapalı' },
  { value: 'completed', label: 'Tamamlandı' },
];

const formatOptions = [
  { value: 'COCO', label: 'COCO' },
  { value: 'YOLO', label: 'YOLO' },
  { value: 'VOC', label: 'Pascal VOC' },
  { value: 'Custom', label: 'Özel' },
];

// Fetch on mount
onMounted(() => {
  listingsStore.fetchListings();
  datasetsStore.fetchDatasets({ limit: 100 }); // Get datasets for create form
  labelSetsStore.fetchLabelSets(); // Get label sets for create form
});

// Debounced search
watch(searchInput, (value) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    listingsStore.setSearch(value);
  }, 300);
});

// Modal handlers
function openCreateModal() {
  formTitle.value = '';
  formDescription.value = '';
  formDatasetId.value = '';
  formLabelSetId.value = '';
  formPriceTotal.value = 0;
  formAnnotationFormat.value = 'COCO';
  formInstructions.value = '';
  showCreateModal.value = true;
}

function openEditModal(listing: { id: string; title: string; description?: string | null; priceTotal: number; dataset?: { name: string }; labelingSpecJson?: { instructions?: string } }) {
  editingId.value = listing.id;
  editTitle.value = listing.title;
  editDescription.value = listing.description || '';
  editPriceTotal.value = listing.priceTotal;
  editDatasetName.value = listing.dataset?.name || '';
  editInstructions.value = listing.labelingSpecJson?.instructions || '';
  showEditModal.value = true;
}

function openDeleteModal(id: string) {
  deletingId.value = id;
  showDeleteModal.value = true;
}

async function handleCreate() {
  if (!formTitle.value.trim() || !formDatasetId.value || !formLabelSetId.value) return;

  // --- Field mapping: Frontend → Backend (Prisma Listing model) ---

  // 1) Get the selected LabelSet's version
  const selectedLabelSet = labelSetsStore.getLabelSetById(formLabelSetId.value);
  const labelSetVersion = selectedLabelSet?.version ?? 1;

  // 2) Package instructions and annotationFormat into labelingSpecJson
  const labelingSpecJson = {
    instructions: formInstructions.value.trim() || undefined,
    format: formAnnotationFormat.value,
  };

  const result = await listingsStore.createListing({
    title: formTitle.value.trim(),
    description: formDescription.value.trim() || undefined,
    datasetId: formDatasetId.value,
    labelSetId: formLabelSetId.value,
    labelSetVersion,
    labelingSpecJson,
    priceTotal: formPriceTotal.value,
    currency: 'TRY',
  });
  if (result) {
    showCreateModal.value = false;
  }
}

async function handleEdit() {
  if (!editingId.value || !editTitle.value.trim()) return;

  const result = await listingsStore.updateListing(editingId.value, {
    title: editTitle.value.trim(),
    description: editDescription.value.trim() || undefined,
    priceTotal: editPriceTotal.value,
  });
  if (result) {
    showEditModal.value = false;
    editingId.value = null;
  }
}

async function handleDelete() {
  if (!deletingId.value) return;
  const result = await listingsStore.deleteListing(deletingId.value);
  if (result) {
    showDeleteModal.value = false;
    deletingId.value = null;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'open':
      return 'badge-success';
    case 'published':
      return 'badge-success';
    case 'draft':
      return 'badge-neutral';
    case 'closed':
      return 'badge-warning';
    case 'completed':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'open':
      return 'Açık';
    case 'published':
      return 'Yayında';
    case 'draft':
      return 'Taslak';
    case 'closed':
      return 'Kapalı';
    case 'completed':
      return 'Tamamlandı';
    default:
      return status;
  }
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(price);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR');
}
</script>

<template>
  <AppLayout>
    <template #header>İlanlar</template>

    <!-- Toolbar -->
    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
        <!-- Search -->
        <div class="relative flex-1 sm:w-64">
          <input
            v-model="searchInput"
            type="search"
            placeholder="İlan ara..."
            class="input pl-10"
            aria-label="İlan ara"
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
        <!-- Status Filter -->
        <BaseSelect
          id="status-filter"
          :model-value="listingsStore.statusFilter"
          :options="statusOptions"
          class="sm:w-48"
          aria-label="Durum filtrele"
          @update:model-value="(v) => listingsStore.setStatusFilter(v as ListingStatus | '')"
        />
      </div>
      <BaseButton variant="primary" @click="openCreateModal">
        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Yeni İlan
      </BaseButton>
    </div>

    <!-- Loading state -->
    <div v-if="listingsStore.loading && listingsStore.listings.length === 0" class="space-y-4">
      <div v-for="i in 4" :key="i" class="card">
        <div class="flex justify-between">
          <div class="flex-1">
            <BaseSkeleton variant="text" class="w-1/3 mb-2" />
            <BaseSkeleton variant="text" class="w-2/3 mb-2" />
            <BaseSkeleton variant="text" class="w-1/4" />
          </div>
          <BaseSkeleton variant="rectangular" class="w-20 h-6" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="listingsStore.error && listingsStore.listings.length === 0" class="card text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ listingsStore.error }}</p>
      <BaseButton variant="secondary" @click="listingsStore.fetchListings()">
        Tekrar Dene
      </BaseButton>
    </div>

    <!-- Empty state -->
    <BaseEmptyState
      v-else-if="listingsStore.listings.length === 0 && !listingsStore.loading"
      :icon="searchInput || listingsStore.statusFilter ? 'search' : 'database'"
      :title="searchInput || listingsStore.statusFilter ? 'Sonuç bulunamadı' : 'Henüz ilan yok'"
      :description="searchInput || listingsStore.statusFilter ? 'Filtrelerinizi değiştirin.' : 'İlk ilanınızı oluşturarak başlayın.'"
    >
      <template v-if="!searchInput && !listingsStore.statusFilter" #action>
        <BaseButton variant="primary" @click="openCreateModal">
          Yeni İlan Oluştur
        </BaseButton>
      </template>
    </BaseEmptyState>

    <!-- Listings list -->
    <div v-else class="space-y-4">
      <article
        v-for="listing in listingsStore.listings"
        :key="listing.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex flex-col sm:flex-row justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-start gap-3 flex-wrap">
              <h2 class="font-semibold text-gray-900 dark:text-white truncate">{{ listing.title }}</h2>
              <span :class="getStatusBadge(listing.status)" class="flex-shrink-0">
                {{ getStatusLabel(listing.status) }}
              </span>
              <span v-if="listing.dataset?.name" class="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded flex-shrink-0">
                Dataset: {{ listing.dataset.name }}
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate-2">
              {{ listing.description || 'Açıklama yok' }}
            </p>
            <div class="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{{ formatDate(listing.createdAt) }}</span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <p class="text-lg font-bold text-gray-900 dark:text-white">
              {{ formatPrice(listing.priceTotal, listing.currency) }}
            </p>
            <!-- Actions -->
            <div class="flex gap-1">
              <BaseButton
                v-if="listing.status === 'published'"
                variant="outline"
                size="sm"
                @click="router.push({ name: 'client-listing-proposals', params: { id: listing.id } })"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Başvuruları Gör
              </BaseButton>
              <button
                v-if="listing.status === 'draft'"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 transition-colors"
                @click="listingsStore.publishListing(listing.id)"
              >
                Yayınla
              </button>
              <button
                v-if="listing.status === 'published'"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 transition-colors"
                @click="listingsStore.unpublishListing(listing.id)"
              >
                Yayından Kaldır
              </button>
              <button
                v-if="listing.status === 'published'"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition-colors"
                @click="listingsStore.closeListing(listing.id)"
              >
                Kapat
              </button>
              <!-- Edit button for open listings -->
              <button
                v-if="listing.status === 'open'"
                type="button"
                class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Düzenle"
                @click="openEditModal(listing)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <!-- Delete button for open listings -->
              <button
                v-if="listing.status === 'open'"
                type="button"
                class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                aria-label="Sil"
                @click="openDeleteModal(listing.id)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- Pagination -->
    <BasePagination
      :current-page="listingsStore.page"
      :total-pages="listingsStore.totalPages"
      :loading="listingsStore.loading"
      class="mt-6"
      @page-change="listingsStore.goToPage"
    />

    <!-- Create Modal -->
    <BaseModal :open="showCreateModal" title="Yeni İlan" size="lg" @close="showCreateModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <BaseInput
          id="create-title"
          v-model="formTitle"
          label="Başlık"
          placeholder="İş ilanı başlığı"
          required
        />
        <div>
          <label for="create-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Açıklama
          </label>
          <textarea
            id="create-description"
            v-model="formDescription"
            class="input"
            rows="2"
            placeholder="İlan açıklaması..."
          ></textarea>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <BaseSelect
            id="create-dataset"
            v-model="formDatasetId"
            label="Dataset"
            :options="datasetsStore.datasets.map(d => ({ value: d.id, label: `${d.name} (${d.assetCount} asset)` }))"
            placeholder="Dataset seçin"
            required
          />
          <BaseSelect
            id="create-labelset"
            v-model="formLabelSetId"
            label="Etiket Seti (Label Set)"
            :options="labelSetsStore.labelSets.map(ls => ({ value: ls.id, label: `${ls.name} (v${ls.version})` }))"
            placeholder="Etiket seti seçin"
            required
          />
        </div>
        <!-- Empty label sets warning -->
        <p
          v-if="!labelSetsStore.loading && labelSetsStore.labelSets.length === 0"
          class="text-sm text-amber-600 dark:text-amber-400 -mt-2"
        >
          ⚠️ Henüz etiket setiniz yok. Önce bir
          <RouterLink
            to="/client/labelsets"
            class="font-medium underline hover:text-amber-700 dark:hover:text-amber-300"
          >etiket seti oluşturun</RouterLink>.
        </p>
        <div class="grid sm:grid-cols-2 gap-4">
          <BaseSelect
            id="create-format"
            v-model="formAnnotationFormat"
            label="Annotation Formatı"
            :options="formatOptions"
          />
          <BaseInput
            id="create-price"
            v-model.number="formPriceTotal"
            label="Toplam İlan Ücreti (TRY)"
            type="number"
            :min="0"
            step="0.01"
            required
          />
        </div>
        <div>
          <label for="create-instructions" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Talimatlar
          </label>
          <textarea
            id="create-instructions"
            v-model="formInstructions"
            class="input"
            rows="3"
            placeholder="Etiketleme talimatları..."
          ></textarea>
        </div>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">İptal</BaseButton>
        <BaseButton variant="primary" :loading="listingsStore.loading" @click="handleCreate">
          Oluştur
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Edit Modal (for open listings) -->
    <BaseModal :open="showEditModal" title="İlanı Düzenle" @close="showEditModal = false">
      <form class="space-y-4" @submit.prevent="handleEdit">
        <BaseInput
          id="edit-dataset"
          :model-value="editDatasetName"
          label="Dataset"
          disabled
        />
        <BaseInput
          id="edit-title"
          v-model="editTitle"
          label="Başlık"
          placeholder="İş ilanı başlığı"
          required
        />
        <div>
          <label for="edit-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Açıklama
          </label>
          <textarea
            id="edit-description"
            v-model="editDescription"
            class="input"
            rows="2"
            placeholder="İlan açıklaması..."
          ></textarea>
        </div>
        <BaseInput
          id="edit-price"
          v-model.number="editPriceTotal"
          label="Toplam İlan Ücreti (TRY)"
          type="number"
          :min="0"
          step="0.01"
        />
        <div>
          <label for="edit-instructions" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Talimatlar
          </label>
          <textarea
            id="edit-instructions"
            v-model="editInstructions"
            class="input"
            rows="3"
            placeholder="Etiketleme talimatları..."
          ></textarea>
        </div>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">İptal</BaseButton>
        <BaseButton variant="primary" :loading="listingsStore.loading" @click="handleEdit">
          Kaydet
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Delete Confirmation Modal -->
    <BaseModal :open="showDeleteModal" title="İlan Sil" size="sm" @close="showDeleteModal = false">
      <p class="text-gray-600 dark:text-gray-400">
        Bu ilanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">İptal</BaseButton>
        <BaseButton variant="danger" :loading="listingsStore.loading" @click="handleDelete">
          Sil
        </BaseButton>
      </template>
    </BaseModal>
  </AppLayout>
</template>
