<script setup lang="ts">
/**
 * NotFoundPage - 404 Error page
 * SEO: noindex, nofollow
 * Accessibility: Semantic main, proper heading hierarchy
 */
import { RouterLink } from 'vue-router';
import { useSeoError } from '@/composables/useSeo';

useSeoError('Sayfa Bulunamadı');
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
    <main class="text-center">
      <p class="text-9xl font-bold text-gray-200 dark:text-gray-700" aria-hidden="true">404</p>
      <h1 class="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">Sayfa Bulunamadı</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Aradığınız sayfa mevcut değil veya taşınmış olabilir.
      </p>
      <RouterLink to="/" class="mt-6 inline-block btn-primary">
        Ana Sayfaya Dön
      </RouterLink>
    </main>
  </div>
</template>
