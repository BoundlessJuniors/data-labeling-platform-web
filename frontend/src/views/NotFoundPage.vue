<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="text-center">
      <h1 class="text-9xl font-bold text-gray-200">404</h1>
      <h2 class="mt-4 text-2xl font-semibold text-gray-900">Sayfa Bulunamadı</h2>
      <p class="mt-2 text-gray-600">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
      <RouterLink to="/" class="mt-6 inline-block btn-primary">
        Ana Sayfaya Dön
      </RouterLink>
    </div>
  </div>
</template>
