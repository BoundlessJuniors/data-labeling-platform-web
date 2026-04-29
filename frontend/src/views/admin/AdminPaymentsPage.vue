<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import type { AdminPaymentDashboardStats, AdminPaymentListItem, AdminPaymentListParams } from '@/types/admin'
import { useToastStore } from '@/stores/toast'
import { getErrorMessage } from '@/types/api'
import BasePagination from '@/components/ui/BasePagination.vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'

// State
const toast = useToastStore()
const loadingStats = ref(false)
const loadingPayments = ref(false)
const stats = ref<AdminPaymentDashboardStats | null>(null)
const payments = ref<AdminPaymentListItem[]>([])

// Pagination & Filters
const currentPage = ref(1)
const totalPages = ref(0)
const itemsPerPage = 20

const filters = ref({
  status: '',
  provider: '',
  search: '',
})

// Options
const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
  { label: 'Expired', value: 'expired' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Released', value: 'released' },
]

// Data fetching
async function fetchStats() {
  loadingStats.value = true
  try {
    const res = await adminApi.getPaymentDashboardStats()
    if (res.data?.success) {
      stats.value = res.data.data
    }
  } catch (error: unknown) {
    console.error('Failed to fetch payment stats:', error)
    toast.error(getErrorMessage(error, 'Payment dashboard istatistikleri yüklenemedi'))
  } finally {
    loadingStats.value = false
  }
}

async function fetchPayments() {
  loadingPayments.value = true
  try {
    const params: AdminPaymentListParams = {
      page: currentPage.value,
      limit: itemsPerPage,
      ...(filters.value.status && { status: filters.value.status }),
      ...(filters.value.provider && { provider: filters.value.provider }),
      ...(filters.value.search && { search: filters.value.search }),
    }
    const res = await adminApi.getPayments(params)
    if (res.data?.success) {
      payments.value = res.data.data || []
      totalPages.value = res.data.pagination?.totalPages || 0
    }
  } catch (error: unknown) {
    console.error('Failed to fetch payments:', error)
    toast.error(getErrorMessage(error, 'Payment kayıtları yüklenemedi'))
  } finally {
    loadingPayments.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchPayments()
}

function clearFilters() {
  filters.value = {
    status: '',
    provider: '',
    search: '',
  }
  handleSearch()
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchPayments()
}

// Initial fetch
onMounted(() => {
  fetchStats()
  fetchPayments()
})

// Helpers
function formatMoney(amount: string | number | undefined, currency = 'USD'): string {
  if (amount === undefined || amount === null) return '-'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num)
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncateString(str?: string | null, len = 8): string {
  if (!str) return '-'
  return str.length > len ? str.substring(0, len) + '...' : str
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'paid':
    case 'released':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
    case 'failed':
    case 'expired':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
    case 'refunded':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300'
  }
}

function getContractStatusBadgeClass(status?: string): string {
  if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300'
  switch (status) {
    case 'active':
    case 'approved':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'pending_payment':
    case 'submitted':
    case 'revision_requested':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
    case 'disputed':
    case 'cancelled':
    case 'refunded':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Payments Dashboard</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitor payment records, escrow balances, and platform fees.
        </p>
      </div>
      <button
        class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-[#1f2937] dark:text-slate-200 dark:border-[#334155] dark:hover:bg-[#374151] transition-colors"
        @click="() => { fetchStats(); fetchPayments(); }"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>

    <!-- Summary Cards -->
    <div v-if="loadingStats" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <BaseSkeleton v-for="i in 8" :key="i" class="h-24 rounded-xl" />
    </div>
    <div v-else-if="stats" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Payments -->
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-5 shadow-sm">
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Total Payments</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-2">{{ stats.totalPayments }}</p>
      </div>
      <!-- Total Paid Volume -->
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-5 shadow-sm">
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Total Paid Volume</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-2">{{ formatMoney(stats.totalPaidAmount) }}</p>
      </div>
      <!-- Escrow Held -->
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-5 shadow-sm">
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Escrow Held (Paid Status)</p>
        <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{{ formatMoney(stats.totalEscrowHeld) }}</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ stats.paidPayments }} active in escrow</p>
      </div>
      <!-- Released -->
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-5 shadow-sm">
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Total Released</p>
        <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{{ formatMoney(stats.totalReleasedAmount) }}</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ stats.releasedPayments }} payments released</p>
      </div>
      <!-- Platform Fee -->
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-5 shadow-sm">
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Platform Fees (Collected)</p>
        <p class="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-2">{{ formatMoney(stats.totalPlatformFeeAmount) }}</p>
      </div>
      <!-- Refunded -->
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-5 shadow-sm">
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Total Refunded</p>
        <p class="text-2xl font-bold text-slate-600 dark:text-slate-300 mt-2">{{ formatMoney(stats.totalRefundedAmount) }}</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ stats.refundedPayments }} payments refunded</p>
      </div>
      <!-- Pending -->
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-5 shadow-sm">
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Checkout</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-2">{{ stats.pendingPayments }}</p>
      </div>
      <!-- Failed / Expired -->
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-5 shadow-sm">
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Failed / Expired</p>
        <p class="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{{ stats.failedPayments + stats.expiredPayments }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-4 shadow-sm">
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Search -->
        <div class="flex-1">
          <label for="search" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="search"
              v-model="filters.search"
              type="text"
              class="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-[#0f172a] dark:border-[#334155] dark:text-white placeholder-slate-400"
              placeholder="UUIDs, Email, Title..."
              @keyup.enter="handleSearch"
            />
          </div>
        </div>
        <!-- Status -->
        <div class="w-full md:w-48">
          <label for="status" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
          <select
            id="status"
            v-model="filters.status"
            class="block w-full pl-3 pr-10 py-2 text-base border border-slate-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg bg-white dark:bg-[#0f172a] dark:border-[#334155] dark:text-white"
            @change="handleSearch"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <!-- Provider -->
        <div class="w-full md:w-48">
          <label for="provider" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Provider</label>
          <input
            id="provider"
            v-model="filters.provider"
            type="text"
            class="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-[#0f172a] dark:border-[#334155] dark:text-white placeholder-slate-400"
            placeholder="e.g. mock"
            @keyup.enter="handleSearch"
          />
        </div>
        <!-- Actions -->
        <div class="flex items-end gap-2">
          <button
            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-[#1f2937] dark:text-slate-200 dark:border-[#334155] dark:hover:bg-[#374151] transition-colors"
            @click="clearFilters"
          >
            Clear
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            @click="handleSearch"
          >
            Filter
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 dark:divide-[#334155]">
          <thead class="bg-slate-50 dark:bg-[#1f2937]">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contract / Listing</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payer / Labeler</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dates</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-[#111827] divide-y divide-slate-200 dark:divide-[#334155]">
            <tr v-if="loadingPayments">
              <td colspan="6" class="px-6 py-4">
                <BaseSkeleton class="h-10 w-full rounded" />
              </td>
            </tr>
            <tr v-else-if="payments.length === 0">
              <td colspan="6" class="px-6 py-10 text-center">
                <BaseEmptyState
                  title="No payments found"
                  description="Adjust your filters or search term."
                  icon="payments"
                />
              </td>
            </tr>
            <tr
              v-for="payment in payments"
              :key="payment.id"
              class="hover:bg-slate-50 dark:hover:bg-[#1f2937] transition-colors"
            >
              <!-- Payment Info -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-slate-900 dark:text-white" :title="payment.id">
                  {{ truncateString(payment.id) }}
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {{ payment.provider }} <span v-if="payment.providerPaymentId">({{ truncateString(payment.providerPaymentId) }})</span>
                </div>
                <div v-if="payment.checkoutUrl" class="text-[10px] mt-1 text-primary-500">
                  <a :href="payment.checkoutUrl" target="_blank" rel="noopener noreferrer" class="hover:underline">Checkout Link</a>
                </div>
              </td>
              <!-- Amount Info -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-slate-900 dark:text-white">
                  {{ formatMoney(payment.amount, payment.currency) }}
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-col gap-0.5">
                  <span title="Labeler Earning">L: {{ formatMoney(payment.labelerEarningAmount, payment.currency) }}</span>
                  <span title="Platform Fee">F: {{ formatMoney(payment.platformFeeAmount, payment.currency) }}</span>
                </div>
              </td>
              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize', getStatusBadgeClass(payment.status)]">
                  {{ payment.status }}
                </span>
              </td>
              <!-- Contract/Listing -->
              <td class="px-6 py-4">
                <div class="text-sm text-slate-900 dark:text-white max-w-[200px] truncate" :title="payment.contract?.listing?.title || '-'">
                  {{ payment.contract?.listing?.title || '-' }}
                </div>
                <div class="text-xs mt-1 flex items-center gap-2">
                  <span class="text-slate-500 dark:text-slate-400" :title="payment.contractId">{{ truncateString(payment.contractId) }}</span>
                  <span :class="['px-1.5 py-0.5 rounded text-[10px] font-medium capitalize', getContractStatusBadgeClass(payment.contract?.status)]">
                    {{ payment.contract?.status || '-' }}
                  </span>
                </div>
              </td>
              <!-- Payer / Labeler -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900 dark:text-white">
                  <span class="text-xs text-slate-400">Payer:</span> {{ payment.payer?.email || '-' }}
                </div>
                <div class="text-sm text-slate-900 dark:text-white mt-1">
                  <span class="text-xs text-slate-400">Labeler:</span> {{ payment.labeler?.email || '-' }}
                </div>
              </td>
              <!-- Dates -->
              <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                <div class="flex flex-col gap-1">
                  <div><span class="font-medium text-slate-400 dark:text-slate-500">Created:</span> {{ formatDate(payment.createdAt) }}</div>
                  <div v-if="payment.paidAt"><span class="font-medium text-slate-400 dark:text-slate-500">Paid:</span> {{ formatDate(payment.paidAt) }}</div>
                  <div v-if="payment.releasedAt"><span class="font-medium text-slate-400 dark:text-slate-500">Released:</span> {{ formatDate(payment.releasedAt) }}</div>
                  <div v-if="payment.refundedAt"><span class="font-medium text-slate-400 dark:text-slate-500">Refunded:</span> {{ formatDate(payment.refundedAt) }}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div v-if="totalPages > 1" class="px-6 py-4 border-t border-slate-200 dark:border-[#334155]">
        <BasePagination
          :current-page="currentPage"
          :total-pages="totalPages"
          @page-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>
