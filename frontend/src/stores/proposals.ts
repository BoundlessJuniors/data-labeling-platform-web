/**
 * Proposals Store - State management for proposals
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { proposalsApi } from '@/api/proposals';
import type { Proposal } from '@/types/proposal';
import { getErrorMessage } from '@/types/api';
import { useToastStore } from './toast';

export const useProposalsStore = defineStore('proposals', () => {
  const toastStore = useToastStore();

  // State
  const proposals = ref<Proposal[]>([]);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch proposals for a specific listing
   */
  async function fetchProposalsByListing(listingId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await proposalsApi.list({ listingId });
      proposals.value = response.data.data;
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Başvurular yüklenemedi');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Accept a proposal (creates contract + tasks)
   */
  async function acceptProposal(id: string) {
    actionLoading.value = true;
    error.value = null;

    try {
      const response = await proposalsApi.accept(id);
      // Update proposal status in local state
      const index = proposals.value.findIndex((p) => p.id === id);
      if (index > -1) {
        proposals.value[index] = { ...proposals.value[index]!, status: 'accepted' as const };
      }
      // Reject all other pending proposals locally
      proposals.value = proposals.value.map((p) => {
        if (p.id !== id && p.status === 'pending') {
          return { ...p, status: 'rejected' as const };
        }
        return p;
      });
      toastStore.success('Teklif kabul edildi ve sözleşme oluşturuldu');
      return response.data.data;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Teklif kabul edilemedi');
      toastStore.error(error.value);
      return null;
    } finally {
      actionLoading.value = false;
    }
  }

  /**
   * Reject a proposal
   */
  async function rejectProposal(id: string) {
    actionLoading.value = true;
    error.value = null;

    try {
      await proposalsApi.reject(id);
      // Update proposal status in local state
      const index = proposals.value.findIndex((p) => p.id === id);
      if (index > -1) {
        proposals.value[index] = { ...proposals.value[index]!, status: 'rejected' as const };
      }
      toastStore.success('Teklif reddedildi');
      return true;
    } catch (_err) {
      error.value = getErrorMessage(_err, 'Teklif reddedilemedi');
      toastStore.error(error.value);
      return false;
    } finally {
      actionLoading.value = false;
    }
  }

  /**
   * Reset store state
   */
  function reset() {
    proposals.value = [];
    loading.value = false;
    actionLoading.value = false;
    error.value = null;
  }

  return {
    // State
    proposals,
    loading,
    actionLoading,
    error,
    // Actions
    fetchProposalsByListing,
    acceptProposal,
    rejectProposal,
    reset,
  };
});
