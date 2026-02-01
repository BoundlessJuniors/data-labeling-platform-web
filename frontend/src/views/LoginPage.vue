<script setup lang="ts">
/**
 * LoginPage - User login
 * Accessibility: Form labels, error announcements
 */
import { ref, onMounted } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSeo } from '@/composables/useSeo';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showError = ref(false);

useSeo({
  title: 'Giriş Yap',
  description: 'DataLabel hesabınıza giriş yapın. Veri etiketleme projelerinizi yönetin.',
});

onMounted(() => {
  authStore.clearError();
});

async function handleSubmit() {
  showError.value = false;

  if (!email.value || !password.value) {
    return;
  }

  const success = await authStore.login({
    email: email.value,
    password: password.value,
  });

  if (success) {
    const redirect = route.query.redirect as string;
    router.push(redirect || '/dashboard');
  } else {
    showError.value = true;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
    <main class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <RouterLink to="/" class="inline-flex items-center space-x-2">
          <div class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center" aria-hidden="true">
            <span class="text-white font-bold text-xl">D</span>
          </div>
          <span class="text-2xl font-bold text-gray-900 dark:text-white">DataLabel</span>
        </RouterLink>
      </div>

      <!-- Card -->
      <div class="card">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
          Giriş Yap
        </h1>

        <!-- Error Message -->
        <div
          v-if="showError && authStore.error"
          class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <p class="text-sm text-red-600 dark:text-red-400">{{ authStore.error }}</p>
        </div>

        <!-- Form -->
        <form class="space-y-4" novalidate @submit.prevent="handleSubmit">
          <div>
            <label for="login-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              E-posta
            </label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="input"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label for="login-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Şifre
            </label>
            <input
              id="login-password"
              v-model="password"
              type="password"
              required
              minlength="6"
              autocomplete="current-password"
              class="input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            :disabled="authStore.loading"
            :aria-busy="authStore.loading"
            class="w-full btn-primary py-3"
          >
            <span v-if="authStore.loading">Giriş yapılıyor...</span>
            <span v-else>Giriş Yap</span>
          </button>
        </form>

        <!-- Register Link -->
        <p class="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Hesabınız yok mu?
          <RouterLink to="/register" class="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
            Kayıt Ol
          </RouterLink>
        </p>
      </div>
    </main>
  </div>
</template>
