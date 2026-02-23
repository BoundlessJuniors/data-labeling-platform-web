<script setup lang="ts">
/**
 * LabelSetsPage - Client label sets management with create/edit/delete
 */
import { ref, onMounted, computed } from 'vue';
import { useLabelSetsStore } from '@/stores/labelsets';
import { useSeo } from '@/composables/useSeo';
import AppLayout from '@/layouts/AppLayout.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';

useSeo({
  title: 'Etiket Setleri',
  description: 'Etiket setlerinizi oluşturun ve yönetin.',
});

const labelSetsStore = useLabelSetsStore();

// Modal state
const showFormModal = ref(false);
const showDeleteModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);

// Form state
const formName = ref('');
const formLabels = ref<{ name: string; color: string }[]>([
  { name: '', color: '#3B82F6' },
]);

// Predefined colors for quick selection
const presetColors = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6',
  '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6', '#6366F1',
];

const formModalTitle = computed(() =>
  isEditing.value ? 'Etiket Setini Düzenle' : 'Yeni Etiket Seti'
);

const formSubmitLabel = computed(() =>
  isEditing.value ? 'Kaydet' : 'Oluştur'
);

const inUseTooltip = 'Bu etiket seti bir ilanda kullanıldığı için değiştirilemez.';

// Fetch on mount
onMounted(() => {
  labelSetsStore.fetchLabelSets();
});

// Helpers
function isInUse(ls: { _count?: { listings?: number } }): boolean {
  return (ls._count?.listings ?? 0) > 0;
}

// Label management
function addLabel() {
  formLabels.value.push({ name: '', color: presetColors[formLabels.value.length % presetColors.length] ?? '#3B82F6' });
}

function removeLabel(index: number) {
  if (formLabels.value.length > 1) {
    formLabels.value.splice(index, 1);
  }
}

// Modal handlers
function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  formName.value = '';
  formLabels.value = [{ name: '', color: '#3B82F6' }];
  showFormModal.value = true;
}

function openEditModal(id: string) {
  const ls = labelSetsStore.getLabelSetById(id);
  if (!ls) return;

  isEditing.value = true;
  editingId.value = id;
  formName.value = ls.name;

  // Populate labels from the set (use existing data or fallback)
  if (ls.labels && ls.labels.length > 0) {
    formLabels.value = ls.labels.map((l) => ({
      name: l.name,
      color: l.color,
    }));
  } else {
    formLabels.value = [{ name: '', color: '#3B82F6' }];
  }

  showFormModal.value = true;
}

function openDeleteModal(id: string) {
  deletingId.value = id;
  showDeleteModal.value = true;
}

async function handleSubmit() {
  if (!formName.value.trim()) return;

  const validLabels = formLabels.value.filter((l) => l.name.trim() !== '');
  if (validLabels.length === 0) return;

  const payload = {
    name: formName.value.trim(),
    labels: validLabels.map((l) => ({
      name: l.name.trim(),
      color: l.color,
    })),
  };

  let result: boolean;
  if (isEditing.value && editingId.value) {
    result = await labelSetsStore.updateLabelSet(editingId.value, payload);
  } else {
    result = await labelSetsStore.createLabelSet(payload);
  }

  if (result) {
    showFormModal.value = false;
  }
}

async function handleDelete() {
  if (!deletingId.value) return;
  const result = await labelSetsStore.deleteLabelSet(deletingId.value);
  if (result) {
    showDeleteModal.value = false;
    deletingId.value = null;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR');
}
</script>

<template>
  <AppLayout>
    <template #header>Etiket Setleri</template>

    <!-- Toolbar -->
    <div class="flex justify-between items-center mb-6">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Etiketleme projeleriniz için etiket setleri oluşturun.
      </p>
      <BaseButton variant="primary" @click="openCreateModal">
        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Yeni Etiket Seti
      </BaseButton>
    </div>

    <!-- Loading state -->
    <div v-if="labelSetsStore.loading && labelSetsStore.labelSets.length === 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="card">
        <BaseSkeleton variant="text" class="w-2/3 mb-3" />
        <BaseSkeleton variant="text" class="w-1/3 mb-2" />
        <div class="flex gap-2 mt-3">
          <BaseSkeleton variant="rectangular" class="w-12 h-6 rounded-full" />
          <BaseSkeleton variant="rectangular" class="w-12 h-6 rounded-full" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-else-if="labelSetsStore.error && labelSetsStore.labelSets.length === 0"
      class="card text-center py-12"
    >
      <p class="text-red-600 dark:text-red-400 mb-4">{{ labelSetsStore.error }}</p>
      <BaseButton variant="secondary" @click="labelSetsStore.fetchLabelSets()">
        Tekrar Dene
      </BaseButton>
    </div>

    <!-- Empty state -->
    <BaseEmptyState
      v-else-if="labelSetsStore.labelSets.length === 0 && !labelSetsStore.loading"
      icon="database"
      title="Henüz etiket seti yok"
      description="İlk etiket setinizi oluşturarak başlayın."
    >
      <template #action>
        <BaseButton variant="primary" @click="openCreateModal">
          Yeni Etiket Seti Oluştur
        </BaseButton>
      </template>
    </BaseEmptyState>

    <!-- Label Sets Grid -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="ls in labelSetsStore.labelSets"
        :key="ls.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1 min-w-0">
            <h2 class="font-semibold text-gray-900 dark:text-white truncate">{{ ls.name }}</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              v{{ ls.version }} · {{ ls._count?.labels ?? 0 }} etiket · {{ formatDate(ls.createdAt) }}
              <span v-if="isInUse(ls)" class="ml-1 text-amber-500 dark:text-amber-400">· Kullanımda</span>
            </p>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <!-- Edit button -->
            <button
              type="button"
              class="p-1.5 rounded transition-colors"
              :class="isInUse(ls)
                ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500'
                : 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400'"
              :disabled="isInUse(ls)"
              :title="isInUse(ls) ? inUseTooltip : 'Düzenle'"
              :aria-label="isInUse(ls) ? inUseTooltip : 'Düzenle'"
              @click="!isInUse(ls) && openEditModal(ls.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <!-- Delete button -->
            <button
              type="button"
              class="p-1.5 rounded transition-colors"
              :class="isInUse(ls)
                ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500'
                : 'hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400'"
              :disabled="isInUse(ls)"
              :title="isInUse(ls) ? inUseTooltip : 'Sil'"
              :aria-label="isInUse(ls) ? inUseTooltip : 'Sil'"
              @click="!isInUse(ls) && openDeleteModal(ls.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Label chips preview -->
        <div v-if="ls.labels && ls.labels.length > 0" class="flex flex-wrap gap-1.5">
          <span
            v-for="label in ls.labels.slice(0, 6)"
            :key="label.id"
            class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <span
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: label.color }"
              aria-hidden="true"
            ></span>
            {{ label.name }}
          </span>
          <span
            v-if="ls.labels.length > 6"
            class="text-xs text-gray-400 dark:text-gray-500 px-1 py-0.5"
          >
            +{{ ls.labels.length - 6 }} daha
          </span>
        </div>
        <div v-else class="flex flex-wrap gap-1.5">
          <span
            v-for="i in Math.min(ls._count?.labels ?? 0, 3)"
            :key="i"
            class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            Etiket {{ i }}
          </span>
          <span
            v-if="(ls._count?.labels ?? 0) > 3"
            class="text-xs text-gray-400 dark:text-gray-500 px-1 py-0.5"
          >
            +{{ (ls._count?.labels ?? 0) - 3 }} daha
          </span>
        </div>
      </article>
    </div>

    <!-- Create / Edit Modal -->
    <BaseModal :open="showFormModal" :title="formModalTitle" size="lg" @close="showFormModal = false">
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <BaseInput
          id="labelset-name"
          v-model="formName"
          label="Etiket Seti Adı"
          placeholder="Örn: Trafik İşaretleri"
          required
        />

        <!-- Dynamic Labels Section -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Etiketler
            </label>
            <button
              type="button"
              class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              @click="addLabel"
            >
              + Etiket Ekle
            </button>
          </div>

          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="(label, index) in formLabels"
              :key="index"
              class="flex items-center gap-2"
            >
              <!-- Color picker -->
              <div class="relative flex-shrink-0">
                <input
                  v-model="label.color"
                  type="color"
                  class="w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5"
                  :aria-label="`Etiket ${index + 1} rengi`"
                />
              </div>

              <!-- Label name -->
              <input
                v-model="label.name"
                type="text"
                class="input flex-1"
                :placeholder="`Etiket adı (Örn: ${ index === 0 ? 'Araba' : index === 1 ? 'Yaya' : 'Bisiklet' })`"
                required
              />

              <!-- Remove button -->
              <button
                v-if="formLabels.length > 1"
                type="button"
                class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors flex-shrink-0"
                aria-label="Etiketi kaldır"
                @click="removeLabel(index)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Quick color palette -->
          <div class="flex gap-1.5 mt-3">
            <span class="text-xs text-gray-400 dark:text-gray-500 self-center mr-1">Renkler:</span>
            <button
              v-for="color in presetColors"
              :key="color"
              type="button"
              class="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
              :style="{ backgroundColor: color }"
              :aria-label="`Renk: ${color}`"
              @click="formLabels.length > 0 ? formLabels[formLabels.length - 1]!.color = color : undefined"
            />
          </div>
        </div>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showFormModal = false">İptal</BaseButton>
        <BaseButton variant="primary" :loading="labelSetsStore.loading" @click="handleSubmit">
          {{ formSubmitLabel }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Delete Confirmation Modal -->
    <BaseModal :open="showDeleteModal" title="Etiket Setini Sil" size="sm" @close="showDeleteModal = false">
      <p class="text-gray-600 dark:text-gray-400">
        Bu etiket setini silmek istediğinizden emin misiniz? Tüm etiketler de silinecektir. Bu işlem geri alınamaz.
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">İptal</BaseButton>
        <BaseButton variant="danger" :loading="labelSetsStore.loading" @click="handleDelete">
          Sil
        </BaseButton>
      </template>
    </BaseModal>
  </AppLayout>
</template>
