<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminApi, type AdminAuditLogListParams } from '@/api/admin';
import type { AdminAuditLogItem } from '@/types/admin';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/types/api';

/**
 * View-model for the audit log table rows.
 * All fields are plain primitives or unknown — no recursive JsonValue.
 * This prevents "Type instantiation is excessively deep" in Vue templates.
 */
interface AuditLogRow {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
  } | null;
  /** Raw meta payload stored as unknown — only rendered via formattedMetaJson computed. */
  metaJson: unknown;
  /** Pre-computed flag so the template never touches the recursive JsonValue type. */
  hasMeta: boolean;
}

/** Maps an API item to the flat view-model. Runs inside fetchLogs, not the template. */
function toAuditLogRow(item: AdminAuditLogItem): AuditLogRow {
  return {
    id: item.id,
    createdAt: item.createdAt,
    action: item.action,
    entityType: item.entityType,
    entityId: item.entityId,
    actor: item.actor ?? null,
    metaJson: item.metaJson ?? null,
    hasMeta: item.metaJson != null,
  };
}

const route = useRoute();
const router = useRouter();
const toast = useToastStore();

// State
const logs = ref<AuditLogRow[]>([]);
const isLoading = ref(true);
const totalPages = ref(1);

const filters = ref({
  page: 1,
  limit: 20,
  action: '',
  entityType: '',
  entityId: '',
  actorSearch: '',
});

const isDetailModalOpen = ref(false);
const detailMetaJson = ref<unknown>(null);

const formattedMetaJson = computed(() => {
  try {
    return JSON.stringify(detailMetaJson.value, null, 2);
  } catch {
    return '{}';
  }
});

// Options
const actionOptions = [
  { label: 'All Actions', value: '' },
  { label: 'user.update', value: 'user.update' },
  { label: 'user.delete', value: 'user.delete' },
  { label: 'contract.approve', value: 'contract.approve' },
  { label: 'contract.reject', value: 'contract.reject' },
  { label: 'contract.cancel', value: 'contract.cancel' },
  { label: 'contract.normalize_retry', value: 'contract.normalize_retry' },
  { label: 'task.accept', value: 'task.accept' },
  { label: 'task.reject', value: 'task.reject' },
  { label: 'task.release_expired_leases', value: 'task.release_expired_leases' },
  { label: 'review.create', value: 'review.create' },
  { label: 'review.resolve', value: 'review.resolve' },
  { label: 'annotation.raw_debug_create', value: 'annotation.raw_debug_create' },
  { label: 'annotation.normalized_upsert', value: 'annotation.normalized_upsert' },
];

const entityTypeOptions = [
  { label: 'All Entities', value: '' },
  { label: 'user', value: 'user' },
  { label: 'contract', value: 'contract' },
  { label: 'task', value: 'task' },
  { label: 'review', value: 'review' },
  { label: 'annotation_raw', value: 'annotation_raw' },
  { label: 'annotation_normalized', value: 'annotation_normalized' },
  { label: 'system', value: 'system' },
];

// Methods
const fetchLogs = async () => {
  isLoading.value = true;
  try {
    const params: AdminAuditLogListParams = {
      page: filters.value.page,
      limit: filters.value.limit,
      action: filters.value.action || undefined,
      entityType: filters.value.entityType || undefined,
      entityId: filters.value.entityId || undefined,
      actorSearch: filters.value.actorSearch || undefined,
    };
    const response = await adminApi.getAuditLogs(params);
    logs.value = response.data.data.map(toAuditLogRow);
    const pagination = response.data.pagination;
    totalPages.value = pagination?.totalPages ?? 1;
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, 'Failed to fetch audit logs'));
  } finally {
    isLoading.value = false;
  }
};

const updateQueryAndFetch = () => {
  const query: Record<string, string> = {};
  if (filters.value.page > 1) query.page = filters.value.page.toString();
  if (filters.value.action) query.action = filters.value.action;
  if (filters.value.entityType) query.entityType = filters.value.entityType;
  if (filters.value.entityId) query.entityId = filters.value.entityId;
  if (filters.value.actorSearch) query.actorSearch = filters.value.actorSearch;

  router.replace({ query }).catch(() => {});
  fetchLogs();
};

const handleFilterChange = () => {
  filters.value.page = 1;
  updateQueryAndFetch();
};

const onPageChange = (np: number) => {
  filters.value.page = np;
  updateQueryAndFetch();
};

const handleClearFilters = () => {
  filters.value = { page: 1, limit: 20, action: '', entityType: '', entityId: '', actorSearch: '' };
  updateQueryAndFetch();
};

const openMetaDetail = (meta: unknown) => {
  detailMetaJson.value = meta;
  isDetailModalOpen.value = true;
};

// Formatting helpers
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

onMounted(() => {
  if (route.query.page) filters.value.page = Number(route.query.page);
  if (route.query.action) filters.value.action = String(route.query.action);
  if (route.query.entityType) filters.value.entityType = String(route.query.entityType);
  if (route.query.entityId) filters.value.entityId = String(route.query.entityId);
  if (route.query.actorSearch) filters.value.actorSearch = String(route.query.actorSearch);
  fetchLogs();
});

watch(() => route.query, (newQ, oldQ) => {
  let changed = false;
  ['action', 'entityType', 'entityId', 'actorSearch', 'page'].forEach(k => {
    if (newQ[k] !== oldQ[k]) changed = true;
  });
  if (changed) {
    filters.value.page = Number(newQ.page) || 1;
    filters.value.action = String(newQ.action || '');
    filters.value.entityType = String(newQ.entityType || '');
    filters.value.entityId = String(newQ.entityId || '');
    filters.value.actorSearch = String(newQ.actorSearch || '');
    fetchLogs();
  }
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Audit Logs</h1>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
      <BaseSelect
        id="audit-action-filter"
        v-model="filters.action"
        :options="actionOptions"
        label="Action"
        @change="handleFilterChange"
      />
      <BaseSelect
        id="audit-entity-type-filter"
        v-model="filters.entityType"
        :options="entityTypeOptions"
        label="Entity Type"
        @change="handleFilterChange"
      />
      <BaseInput
        id="audit-actor-search"
        v-model="filters.actorSearch"
        label="Actor (Email or Name)"
        placeholder="Search actor..."
        @keyup.enter="handleFilterChange"
      />
      <BaseInput
        id="audit-entity-id"
        v-model="filters.entityId"
        label="Entity ID"
        placeholder="Exact ID..."
        @keyup.enter="handleFilterChange"
      />
      <div class="col-span-full flex justify-end gap-2">
        <BaseButton variant="outline" size="sm" @click="handleClearFilters">Clear</BaseButton>
        <BaseButton variant="primary" size="sm" @click="handleFilterChange">Search</BaseButton>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div v-if="isLoading" class="p-8 flex justify-center">
        <div class="animate-spin text-blue-600">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
      <BaseEmptyState
        v-else-if="logs.length === 0"
        title="No Logs Found"
        message="No audit logs matched your search criteria."
      />
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actor</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Target Entity</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Meta</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-slate-200">
            <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {{ formatDate(log.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {{ log.action }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-slate-900">{{ log.actor?.displayName || 'Unknown' }}</div>
                <div class="text-sm text-slate-500">{{ log.actor?.email }}</div>
                <div class="text-xs text-slate-400 capitalize">{{ log.actor?.role }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900">{{ log.entityType }}</div>
                <div class="text-xs text-slate-500 font-mono">{{ log.entityId }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <BaseButton v-if="log.hasMeta" variant="outline" size="sm" @click="openMetaDetail(log.metaJson)">
                  View Data
                </BaseButton>
                <span v-else class="text-slate-400 italic">None</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div v-if="logs.length > 0 && totalPages > 1" class="px-6 py-4 border-t border-slate-200">
        <BasePagination
          :current-page="filters.page"
          :total-pages="totalPages"
          @page-change="onPageChange"
        />
      </div>
    </div>

    <!-- Meta Details Modal -->
    <BaseModal :open="isDetailModalOpen" title="Audit Log Details" @close="isDetailModalOpen = false">
      <div class="bg-slate-900 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
        <pre class="text-emerald-400 font-mono text-sm whitespace-pre-wrap">{{ formattedMetaJson }}</pre>
      </div>
      <template #footer>
        <BaseButton variant="outline" @click="isDetailModalOpen = false">Close</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
