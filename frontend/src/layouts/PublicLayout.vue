<script setup lang="ts">
/**
 * PublicLayout - Layout for unauthenticated pages
 * Used for login, register, landing pages
 */
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import BetaNotice from '@/components/public/BetaNotice.vue';

const authStore = useAuthStore();
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex flex-col">
    <BetaNotice />
    <!-- Header -->
    <header class="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md shadow-sm dark:border-b dark:border-[#1e293b] sticky top-0 z-40 transition-colors duration-300">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div class="flex justify-between items-center h-16">
          <!-- Left side: Logo & Main Nav -->
          <div class="flex items-center gap-8">
            <RouterLink
              to="/"
              class="flex items-center gap-2 group"
            >
              <div class="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-105" aria-hidden="true">
                <img src="@/assets/LabelGun.png" alt="LabelGun Logo" class="w-full h-full object-contain rounded-md" />
              </div>
              <span class="text-xl font-bold text-gray-900 dark:text-white transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
                LabelGun
              </span>
            </RouterLink>

            <div class="hidden md:flex items-center gap-6">
              <RouterLink
                to="/"
                class="text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                active-class="text-primary-600 dark:text-primary-400 font-semibold"
              >
                Ana Sayfa
              </RouterLink>
              <RouterLink
                to="/download"
                class="text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                active-class="text-primary-600 dark:text-primary-400 font-semibold"
              >
                Desktop İndir
              </RouterLink>
            </div>
          </div>

          <!-- Right side: Auth Links -->
          <div class="flex items-center gap-4">
            <template v-if="authStore.isAuthenticated">
              <RouterLink
                to="/dashboard"
                class="px-5 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-sm shadow-primary-600/20 transition-all hover:shadow-md hover:shadow-primary-600/30"
              >
                Dashboard
              </RouterLink>
            </template>
            <template v-else>
              <RouterLink
                to="/login"
                class="text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Giriş Yap
              </RouterLink>
              <RouterLink
                to="/register"
                class="px-5 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-sm shadow-primary-600/20 transition-all hover:shadow-md hover:shadow-primary-600/30"
              >
                Kayıt Ol
              </RouterLink>
            </template>
          </div>
        </div>

        <!-- Mobile Nav -->
        <div class="md:hidden flex items-center gap-4 border-t border-gray-200 dark:border-[#1e293b] py-3">
          <RouterLink
            to="/"
            class="text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            active-class="text-primary-600 dark:text-primary-400 font-semibold"
          >
            Ana Sayfa
          </RouterLink>
          <RouterLink
            to="/download"
            class="text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            active-class="text-primary-600 dark:text-primary-400 font-semibold"
          >
            Desktop İndir
          </RouterLink>
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
          © {{ new Date().getFullYear() }} LabelGun Platform. BoundlessJuniors.
        </p>
      </div>
    </footer>
  </div>
</template>
