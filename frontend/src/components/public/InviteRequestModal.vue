<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const authStore = useAuthStore();
const toastStore = useToastStore();

const email = ref('');
const errorMsg = ref('');

function close() {
  emit('close');
  email.value = '';
  errorMsg.value = '';
}

async function handleSubmit() {
  errorMsg.value = '';
  if (!email.value || !email.value.includes('@')) {
    errorMsg.value = 'Geçerli bir e-posta adresi girin.';
    return;
  }
  
  const success = await authStore.requestInvite(email.value);
  if (success) {
    toastStore.success('Davetiye talebiniz alındı. Uygun görülürse e-posta adresinize davetiye kodu gönderilecektir.');
    close();
  } else {
    errorMsg.value = 'Davetiye talebi gönderilemedi. Lütfen daha sonra tekrar deneyin.';
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Davetiye Kodu Talep Et"
    @close="close"
  >
    <form class="space-y-4" novalidate @submit.prevent="handleSubmit">
      <p class="text-sm text-gray-600 dark:text-slate-400 mb-4">
        Platform beta aşamasında olduğu için kayıtlar davetiye ile yapılmaktadır. Talebinizi iletmek için e-posta adresinizi girin.
      </p>
      
      <div v-if="errorMsg" class="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg" role="alert" aria-live="assertive">
        <p class="text-sm text-red-600 dark:text-red-400">{{ errorMsg }}</p>
      </div>

      <BaseInput
        id="invite-email"
        v-model="email"
        type="email"
        label="E-posta"
        placeholder="ornek@email.com"
        required
      />

      <div class="flex justify-end gap-3 mt-6">
        <BaseButton type="button" variant="secondary" @click="close">İptal</BaseButton>
        <BaseButton type="submit" variant="primary" :loading="authStore.loading">Talep Gönder</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
