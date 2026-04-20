<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminApi } from '@/api/admin';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/types/api';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import QcImageCanvas from '@/components/contracts/QcImageCanvas.vue';
import type { QcTaskView } from '@/types/qc';

interface AnnotationRawLite {
  id: string;
  taskId: string;
  labelerUserId: string;
  leaseToken: string | null;
  payloadHash: string;
  payloadJson: unknown;
  createdAt: string;
  labeler?: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

interface AnnotationNormalizedLite {
  id: string;
  taskId: string;
  labelerUserId: string;
  normalizedJson: unknown;
  version: number;
  createdAt: string;
  updatedAt: string;
  labeler?: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

interface TaskAnnotationsLite {
  raw: AnnotationRawLite[];
  normalized: AnnotationNormalizedLite | null;
}

const toastStore = useToastStore();
const route = useRoute();
const router = useRouter();

const searchTaskId = ref('');
const loadedTaskId = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);

const annotations = ref<TaskAnnotationsLite | null>(null);
const qcViewData = ref<QcTaskView | null>(null);

// Forms
const newRawJson = ref('');
const newNormalizedJson = ref('');

// Modals
const isConfirmModalOpen = ref(false);
const confirmAction = ref<'raw' | 'normalized' | null>(null);

async function loadData() {
  const tId = searchTaskId.value.trim();
  if (!tId) {
    toastStore.warning('Lütfen bir Task ID girin');
    return;
  }
  
  isLoading.value = true;
  annotations.value = null;
  qcViewData.value = null;
  newRawJson.value = '';
  newNormalizedJson.value = '';

  try {
    const annoRes = await adminApi.getTaskAnnotations(tId);
    const qcRes = await adminApi.getTaskQcView(tId);
    
    if (annoRes.data.success) {
      const annoData = annoRes.data.data;

      annotations.value = {
        raw: annoData.raw.map((raw) => ({
          id: raw.id,
          taskId: raw.taskId,
          labelerUserId: raw.labelerUserId,
          leaseToken: raw.leaseToken,
          payloadHash: raw.payloadHash,
          payloadJson: raw.payloadJson,
          createdAt: raw.createdAt,
          labeler: raw.labeler,
        })),
        normalized: annoData.normalized
          ? {
              id: annoData.normalized.id,
              taskId: annoData.normalized.taskId,
              labelerUserId: annoData.normalized.labelerUserId,
              normalizedJson: annoData.normalized.normalizedJson,
              version: annoData.normalized.version,
              createdAt: annoData.normalized.createdAt,
              updatedAt: annoData.normalized.updatedAt,
              labeler: annoData.normalized.labeler,
            }
          : null,
      };

      const normalized = annotations.value?.normalized;
      if (normalized) {
        newNormalizedJson.value = JSON.stringify(normalized.normalizedJson, null, 2);
      }
    }
    
    if (qcRes.data.success) {
      const qcData = qcRes.data.data;
      const asset = qcData.asset;

      if (!asset) {
        qcViewData.value = null;
      } else {
        qcViewData.value = {
          id: qcData.id,
          status: qcData.status,
          asset,
          imageUrl: qcData.imageUrl,
          latestRaw: qcData.latestRaw
            ? {
                id: qcData.latestRaw.id,
                taskId: qcData.latestRaw.taskId,
                labelerUserId: qcData.latestRaw.labelerUserId,
                payloadJson: qcData.latestRaw.payloadJson,
                createdAt: qcData.latestRaw.createdAt,
              }
            : null,
          normalized: qcData.normalized
            ? {
                id: qcData.normalized.id,
                taskId: qcData.normalized.taskId,
                normalizedJson: qcData.normalized.normalizedJson,
                version: qcData.normalized.version,
              }
            : null,
          normalizeReady: qcData.normalizeReady,
          labelSet: qcData.labelSet
            ? {
                id: qcData.labelSet.id,
                name: qcData.labelSet.name,
                version: qcData.labelSet.version,
                labels: qcData.labelSet.labels.map((label) => ({
                  id: label.id,
                  name: label.name,
                  color: label.color,
                  attributesSchemaJson: label.attributesSchemaJson ?? null,
                })),
              }
            : null,
        };
      }
    } else {
      qcViewData.value = null;
    }
    
    loadedTaskId.value = tId;
    
    // update url
    router.replace({
      query: { ...route.query, taskId: tId },
    }).catch(() => {});

  } catch (error) {
    toastStore.error(getErrorMessage(error, 'Veriler yüklenemedi. Task ID geçerli mi?'));
  } finally {
    isLoading.value = false;
  }
}

function promptSubmitRaw() {
  if (!loadedTaskId.value) return;
  try {
    JSON.parse(newRawJson.value);
  } catch {
    toastStore.error('Geçersiz JSON formatı. Lütfen düzeltip tekrar deneyin.');
    return;
  }
  confirmAction.value = 'raw';
  isConfirmModalOpen.value = true;
}

function promptSubmitNormalized() {
  if (!loadedTaskId.value) return;
  try {
    JSON.parse(newNormalizedJson.value);
  } catch {
    toastStore.error('Geçersiz JSON formatı. Lütfen düzeltip tekrar deneyin.');
    return;
  }
  confirmAction.value = 'normalized';
  isConfirmModalOpen.value = true;
}

async function executeConfirmAction() {
  if (confirmAction.value === 'raw') {
    await submitRaw();
  } else if (confirmAction.value === 'normalized') {
    await submitNormalized();
  }
  isConfirmModalOpen.value = false;
}

async function submitRaw() {
  if (!loadedTaskId.value) return;
  
  let payloadObj;
  try {
    payloadObj = JSON.parse(newRawJson.value);
  } catch {
    toastStore.error('Geçersiz JSON formatı. Lütfen düzeltip tekrar deneyin.');
    return;
  }

  isSubmitting.value = true;
  try {
    await adminApi.createRawAnnotation({
      taskId: loadedTaskId.value,
      payloadJson: payloadObj
    });
    toastStore.success('Raw annotation başarıyla eklendi');
    newRawJson.value = '';
    // Reload local data
    await loadData();
  } catch (error) {
    toastStore.error(getErrorMessage(error, 'Raw eklentisi başarısız'));
  } finally {
    isSubmitting.value = false;
  }
}

async function submitNormalized() {
  if (!loadedTaskId.value) return;
  
  let payloadObj;
  try {
    payloadObj = JSON.parse(newNormalizedJson.value);
  } catch {
    toastStore.error('Geçersiz JSON formatı. Lütfen düzeltip tekrar deneyin.');
    return;
  }

  isSubmitting.value = true;
  try {
    await adminApi.normalizeAnnotation({
      taskId: loadedTaskId.value,
      normalizedJson: payloadObj
    });
    toastStore.success('Normalized annotation başarıyla güncellendi');
    // Reload local data
    await loadData();
  } catch (error) {
    toastStore.error(getErrorMessage(error, 'Normalized güncelleme başarısız'));
  } finally {
    isSubmitting.value = false;
  }
}

const rawHistory = computed<AnnotationRawLite[]>(() => {
  return annotations.value?.raw || [];
});

const normalizedItem = computed(() => {
  return annotations.value?.normalized || null;
});

onMounted(() => {
  if (route.query.taskId) {
    searchTaskId.value = String(route.query.taskId);
    loadData();
  }
});
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Annotation Debug</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Raw & Normalized payload'ları doğrudan kontrol edin ve admin müdahalesi yapın.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <BaseInput
          id="search-task-id"
          v-model="searchTaskId"
          placeholder="Task ID (UUID)"
          class="w-80 bg-white"
          @keyup.enter="loadData"
        />
        <BaseButton :disabled="isLoading" variant="primary" @click="loadData">
          <template v-if="isLoading">Yükleniyor...</template>
          <template v-else>Load Task</template>
        </BaseButton>
      </div>
    </div>

    <!-- Warnings -->
    <div class="bg-orange-50 border-l-4 border-orange-400 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-orange-800">Önemli Uyarı</h3>
          <div class="mt-2 text-sm text-orange-700">
            <p>Admin paneli üzerinden yapılan <strong>Raw Insert</strong> işlemi işçilerin standart akışına (leaseToken gereksinimleri) sahip değildir. Normalize pipeline'ı, admin tarafından yüklenen raw payload'ları <strong>yok sayar</strong>. Yüklediğiniz ham verilerin doğrudan normalize versiyonuna dönüştürülmesini sağlamak isterseniz sağ taraftan <strong>Normalized Upsert</strong> işlemini manuel olarak çalıştırmalısınız.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div v-if="loadedTaskId && !isLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left Column: Data & Forms -->
      <div class="space-y-6">
        
        <!-- Normalized Data Table & Upsert -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Normalized Annotation</h3>
          </div>
          <div class="p-4 space-y-4">
            <div v-if="normalizedItem" class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span class="font-medium text-gray-900 dark:text-gray-100">Version:</span> {{ normalizedItem.version }} &bull; 
              <span class="font-medium text-gray-900 dark:text-gray-100">Date:</span> {{ new Date(normalizedItem.updatedAt).toLocaleString('tr-TR') }}
            </div>
            <div v-else class="text-sm text-gray-500 mb-2">
              Mevcut Normalized kayıt bulunamadı.
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                JSON Payload (Edit & Upsert)
              </label>
              <textarea
                v-model="newNormalizedJson"
                rows="8"
                class="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                placeholder='{"type": "export", "version": "1.0", "data": []}'
              ></textarea>
            </div>
            
            <div class="flex justify-end">
              <BaseButton :disabled="isSubmitting || !newNormalizedJson.trim()" variant="primary" @click="promptSubmitNormalized">
                Normalized Upsert
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Raw Data List & Insert -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Raw Annotations History</h3>
          </div>
          <div class="p-4 space-y-6">
            
            <div v-if="rawHistory.length > 0" class="space-y-4 max-h-96 overflow-y-auto">
              <div v-for="raw in rawHistory" :key="raw.id" class="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <div class="text-xs text-gray-500 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2 flex justify-between">
                  <span>{{ new Date(raw.createdAt).toLocaleString('tr-TR') }}</span>
                  <span v-if="raw.leaseToken" class="text-green-600">Lease: {{ raw.leaseToken.substring(0,8) }}...</span>
                  <span v-else class="text-red-500">Admin Debug (No Lease)</span>
                </div>
                <pre class="text-xs text-gray-800 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap break-words">{{ JSON.stringify(raw.payloadJson, null, 2) }}</pre>
              </div>
            </div>
            <div v-else class="text-sm text-gray-500">
              Raw annotation kaydı bulunamadı.
            </div>

            <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Insert New Raw JSON
              </label>
              <textarea
                v-model="newRawJson"
                rows="6"
                class="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                placeholder='{ "shapes": [] }'
              ></textarea>
              <div class="mt-3 flex justify-end">
                <BaseButton :disabled="isSubmitting || !newRawJson.trim()" variant="secondary" @click="promptSubmitRaw">
                  Insert Raw
                </BaseButton>
              </div>
            </div>
            
          </div>
        </div>
        
      </div>

      <!-- Right Column: Visual Preview -->
      <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden sticky top-6">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">QC Preview (Live Image)</h3>
            <span v-if="qcViewData?.status" class="px-2 py-0.5 text-xs rounded-full border bg-white dark:bg-gray-700">{{ qcViewData.status }}</span>
          </div>
          <div class="p-4 bg-gray-100 dark:bg-gray-900">
            <QcImageCanvas v-if="qcViewData" :task-view="qcViewData" />
            <div v-else class="text-sm text-gray-500 text-center py-12">
              Visual preview yüklenemedi.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <BaseModal
      :open="isConfirmModalOpen"
      :title="confirmAction === 'raw' ? 'Raw Annotation Yükle' : 'Normalized Data Güncelle'"
      size="sm"
      @close="isConfirmModalOpen = false"
    >
      <div class="space-y-4">
        <p v-if="confirmAction === 'raw'" class="text-sm text-gray-600 dark:text-gray-300">
          Bu işlem, işçi ekranlarını simüle etmeden (lease objesi olmadan) DB'ye ham veri ekler. Normalize Worker tarafından YENİDEN İŞLENMEYECEKTİR. Devam etmek istiyor musunuz? 
        </p>
        <p v-if="confirmAction === 'normalized'" class="text-sm text-gray-600 dark:text-gray-300">
          Bu işlem, Normalized Annotation tablosundaki mecvut veriyi manuel girdiğiniz payload ile üstüne yazacaktır (upsert). Müşteri export'larına doğrudan yansıyacaktır. Onaylıyor musunuz?
        </p>
      </div>
      <template #footer>
        <BaseButton variant="outline" @click="isConfirmModalOpen = false">İptal</BaseButton>
        <BaseButton
          variant="danger"
          :loading="isSubmitting"
          @click="executeConfirmAction"
        >
          Onayla ve Yaz
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
