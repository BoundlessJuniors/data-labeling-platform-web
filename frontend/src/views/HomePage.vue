<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-lg">D</span>
          </div>
          <span class="text-xl font-bold text-gray-900">DataLabel</span>
        </div>
        
        <div class="flex items-center space-x-4">
          <template v-if="authStore.isAuthenticated">
            <RouterLink to="/dashboard" class="btn-primary">
              Dashboard
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink to="/login" class="text-gray-600 hover:text-gray-900 font-medium">
              Giriş Yap
            </RouterLink>
            <RouterLink to="/register" class="btn-primary">
              Kayıt Ol
            </RouterLink>
          </template>
        </div>
      </nav>
    </header>

    <!-- Hero Section -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div class="text-center">
        <h1 class="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
          Veri Etiketleme
          <span class="text-primary-600 block">Platformu</span>
        </h1>
        <p class="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
          Görsel veri etiketleme projelerinizi kolayca yönetin. 
          Dataset yükleyin, labeler'lara görev atayın ve kaliteli etiketli veri elde edin.
        </p>
        <div class="mt-10 flex justify-center gap-4">
          <RouterLink to="/register" class="btn-primary text-lg px-8 py-3">
            Hemen Başla
          </RouterLink>
          <a href="#features" class="btn-outline text-lg px-8 py-3">
            Özellikler
          </a>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">
        Platform Özellikleri
      </h2>
      
      <div class="grid md:grid-cols-3 gap-8">
        <!-- Feature 1 -->
        <div class="card hover:shadow-lg transition-shadow">
          <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Dataset Yönetimi</h3>
          <p class="text-gray-600">
            Görsellerinizi kolayca yükleyin ve organize edin. Farklı formatları destekler.
          </p>
        </div>

        <!-- Feature 2 -->
        <div class="card hover:shadow-lg transition-shadow">
          <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Görev Yönetimi</h3>
          <p class="text-gray-600">
            Etiketleme görevlerini oluşturun, dağıtın ve takip edin. Gerçek zamanlı ilerleme.
          </p>
        </div>

        <!-- Feature 3 -->
        <div class="card hover:shadow-lg transition-shadow">
          <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Kalite Kontrol</h3>
          <p class="text-gray-600">
            Etiketleme kalitesini review sistemiyle kontrol edin. Onay ve red mekanizması.
          </p>
        </div>

        <!-- Feature 4 -->
        <div class="card hover:shadow-lg transition-shadow">
          <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Güvenli Ödeme</h3>
          <p class="text-gray-600">
            Escrow sistemi ile güvenli ödeme. İş tamamlandığında labeler'a ödeme yapılır.
          </p>
        </div>

        <!-- Feature 5 -->
        <div class="card hover:shadow-lg transition-shadow">
          <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Labeler Ağı</h3>
          <p class="text-gray-600">
            Yetenekli labeler'larla çalışın. Rating sistemiyle en iyi etiketleyicileri bulun.
          </p>
        </div>

        <!-- Feature 6 -->
        <div class="card hover:shadow-lg transition-shadow">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Export</h3>
          <p class="text-gray-600">
            Etiketli verileri COCO, YOLO ve diğer formatlarda dışa aktarın.
          </p>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="bg-primary-600 py-16">
      <div class="max-w-4xl mx-auto text-center px-4">
        <h2 class="text-3xl font-bold text-white mb-4">
          Hemen Başlayın
        </h2>
        <p class="text-primary-100 text-lg mb-8">
          Ücretsiz hesap oluşturun ve veri etiketleme projelerinizi yönetmeye başlayın.
        </p>
        <RouterLink to="/register" class="inline-block bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors">
          Ücretsiz Kayıt Ol
        </RouterLink>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-400 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="flex items-center space-x-2 mb-4 md:mb-0">
            <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">D</span>
            </div>
            <span class="text-xl font-bold text-white">DataLabel</span>
          </div>
          <p class="text-sm">
            © 2026 DataLabel Platform. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
