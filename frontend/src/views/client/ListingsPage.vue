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
import ClientListingCard from '@/components/listings/ClientListingCard.vue';

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
const editAnnotationFormat = ref<AnnotationFormat>('COCO');
const editInstructions = ref('');
const editDatasetName = ref('');

// Search & Filter
const searchInput = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

// Status filter options
const statusOptions = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'open', label: 'Açık' },
  { value: 'payment_pending', label: 'Ödeme Bekliyor' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'cancelled', label: 'İptal Edildi' },
];

const formatOptions = [
  { value: 'COCO', label: 'COCO' },
  { value: 'YOLO', label: 'YOLO' },
  { value: 'VOC', label: 'Pascal VOC' },
  { value: 'Custom', label: 'Özel' },
];

// Fetch on mount
onMounted(() => {
  listingsStore.fetchListings({ ownOnly: true });
  datasetsStore.fetchDatasets({ limit: 100 }); // Get datasets for create form
  labelSetsStore.fetchLabelSets(); // Get label sets for create form
});

// Debounced search
watch(searchInput, (value) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    listingsStore.setSearch(value, { ownOnly: true });
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

function openEditModal(listing: { id: string; title: string; description?: string | null; priceTotal: number; annotationFormat?: AnnotationFormat; dataset?: { name: string }; labelingSpecJson?: { instructions?: string } }) {
  editingId.value = listing.id;
  editTitle.value = listing.title;
  editDescription.value = listing.description || '';
  editPriceTotal.value = listing.priceTotal;
  editAnnotationFormat.value = listing.annotationFormat || 'COCO';
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

  // 2) Package instructions into labelingSpecJson (format is now top-level)
  const labelingSpecJson = {
    instructions: formInstructions.value.trim() || undefined,
  };

  const result = await listingsStore.createListing({
    title: formTitle.value.trim(),
    description: formDescription.value.trim() || undefined,
    datasetId: formDatasetId.value,
    labelSetId: formLabelSetId.value,
    labelSetVersion,
    labelingSpecJson,
    annotationFormat: formAnnotationFormat.value,
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
    annotationFormat: editAnnotationFormat.value,
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

</script>

<template>
  <AppLayout>
    <template #header>
      <div class="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-col md:flex-row md:items-center gap-6 flex-1">
          <h1 class="text-xl font-bold text-gray-900 dark:text-white shrink-0">İlanlar</h1>
          <div class="flex flex-1 gap-3 max-w-2xl">
            <!-- Search -->
            <div class="relative flex-1 sm:w-64">
              <input
                id="search-input"
                v-model="searchInput"
                type="search"
                placeholder="İlan ara..."
                class="input pl-10"
                aria-label="İlan ara"
              />
              <svg
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
              size="sm"
              :model-value="listingsStore.statusFilter"
              :options="statusOptions"
              class="sm:w-48"
              aria-label="Durum filtrele"
              @update:model-value="(v) => listingsStore.setStatusFilter(v as ListingStatus | '', { ownOnly: true })"
            />
          </div>
        </div>
        <BaseButton variant="primary" @click="openCreateModal">
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Yeni İlan
        </BaseButton>
      </div>
    </template>

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
      <BaseButton variant="secondary" @click="listingsStore.fetchListings({ ownOnly: true })">
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
      <ClientListingCard
        v-for="listing in listingsStore.listings"
        :key="listing.id"
        :listing="listing"
        @view-proposals="router.push({ name: 'client-listing-proposals', params: { id: $event } })"
        @edit="openEditModal($event)"
        @delete="openDeleteModal($event)"
      />
    </div>

    <!-- Pagination -->
    <BasePagination
      :current-page="listingsStore.page"
      :total-pages="listingsStore.totalPages"
      :loading="listingsStore.loading"
      class="mt-6"
      @page-change="(page) => listingsStore.goToPage(page, { ownOnly: true })"
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
        <BaseSelect
          id="edit-format"
          v-model="editAnnotationFormat"
          label="Annotation Formatı"
          :options="formatOptions"
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
