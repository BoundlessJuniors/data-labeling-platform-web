<script setup lang="ts">
/**
 * PublicLayout - Layout for unauthenticated pages
 * Used for login, register, landing pages
 */
import { RouterLink } from 'vue-router';
import BetaNotice from '@/components/public/BetaNotice.vue';
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex flex-col">
    <BetaNotice />
    <!-- Header -->
    <header class="bg-white dark:bg-[#111827] shadow-sm dark:border-b dark:border-[#334155]">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div class="flex justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center">
            <RouterLink
              to="/"
              class="text-xl font-bold text-primary-600 dark:text-primary-400"
            >
              DataLabel
            </RouterLink>
          </div>

          <!-- Nav links -->
          <div class="flex items-center gap-4">
            <RouterLink
              to="/login"
              class="text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Giriş Yap
            </RouterLink>
            <RouterLink
              to="/register"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Kayıt Ol
            </RouterLink>
          </div>
        </div>
      </nav>
    </header>

    <!-- Main content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-white dark:bg-[#111827] border-t border-gray-200 dark:border-[#334155]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p class="text-center text-sm text-gray-500 dark:text-slate-400">
          © {{ new Date().getFullYear() }} DataLabel Platform. BoundlessJuniors.
        </p>
      </div>
    </footer>
  </div>
</template>
