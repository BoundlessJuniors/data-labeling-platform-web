<script setup lang="ts">
/**
 * HomePage - Landing page
 * SEO: Primary landing, full meta
 * Accessibility: Proper landmarks, single h1
 */
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSeo } from '@/composables/useSeo';
import PublicLayout from '@/layouts/PublicLayout.vue';

const authStore = useAuthStore();

useSeo({
  title: 'Ana Sayfa',
  description: 'LabelGun - Görsel veri etiketleme platformu. Dataset yönetimi, desktop etiketleme uygulaması ve kalite kontrol sistemi.',
});
</script>

<template>
  <PublicLayout>
    <div class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0f172a] dark:to-[#0f172a]">
      <!-- Skip to content link for keyboard users -->
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg"
      >
        İçeriğe atla
      </a>

      <!-- Main content -->
      <div id="main-content">
        <!-- Hero Section -->
        <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32" aria-labelledby="hero-title">
          <div class="text-center max-w-4xl mx-auto">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-medium mb-8">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              Web + Desktop Labeling Workflow
            </div>
            
            <h1 id="hero-title" class="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
              LabelGun
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400 block mt-2">Veri Etiketleme Platformu</span>
            </h1>
            
            <p class="mt-6 text-xl text-gray-600 dark:text-slate-300">
              Müşteriler datasetlerini yükleyip ilan açar, etiketleyiciler LabelGun masaüstü uygulaması üzerinden offline etiketleme yapar, sistem sonuçları kalite kontrolden geçirip dışa aktarır.
            </p>
            
            <div class="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <RouterLink :to="authStore.isAuthenticated ? '/dashboard' : '/register'" class="px-8 py-4 text-lg font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-600/30 transition-all hover:scale-105">
                Hemen Başla
              </RouterLink>
              <RouterLink to="/download" class="px-8 py-4 text-lg font-medium bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white border border-gray-200 dark:border-[#334155] rounded-xl hover:bg-gray-50 dark:hover:bg-[#2dd4bf]/10 transition-all hover:border-primary-500/50">
                LabelGun Desktop İndir
              </RouterLink>
            </div>
          </div>

          <!-- Flow Visualization Card -->
          <div class="mt-20 max-w-5xl mx-auto relative group">
            <div class="absolute -inset-1 bg-gradient-to-r from-primary-600 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div class="relative bg-white dark:bg-[#111827] ring-1 ring-gray-200 dark:ring-white/10 rounded-2xl p-8 shadow-2xl">
              <div class="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
                <div class="flex-1">
                  <div class="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                  </div>
                  <h4 class="font-semibold text-gray-900 dark:text-white">Dataset & İlan</h4>
                  <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">Veri Yükleme</p>
                </div>
                <svg class="hidden md:block w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                <div class="flex-1">
                  <div class="w-12 h-12 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <h4 class="font-semibold text-gray-900 dark:text-white">Sözleşme</h4>
                  <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">Mock Test Ödeme</p>
                </div>
                <svg class="hidden md:block w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                <div class="flex-1">
                  <div class="w-12 h-12 mx-auto bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <h4 class="font-semibold text-gray-900 dark:text-white">Desktop App</h4>
                  <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">Yerel Etiketleme</p>
                </div>
                <svg class="hidden md:block w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                <div class="flex-1">
                  <div class="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                  </div>
                  <h4 class="font-semibold text-gray-900 dark:text-white">QC & Export</h4>
                  <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">Kontrol ve İndirme</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Features Section -->
        <section id="features" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white/50 dark:bg-[#111827]/50 backdrop-blur-sm" aria-labelledby="features-title">
          <div class="text-center mb-16">
            <h2 id="features-title" class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Platform Özellikleri
            </h2>
            <p class="mt-4 text-lg text-gray-600 dark:text-slate-400">
              Veri etiketleme sürecini güvenli ve hızlı hale getiren araçlar
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <!-- Feature 1 -->
            <article class="bg-white dark:bg-[#1e293b] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-[#334155] hover:shadow-lg transition-shadow">
              <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6" aria-hidden="true">
                <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Dataset Yönetimi</h3>
              <p class="text-gray-600 dark:text-slate-400 leading-relaxed">
                Görsellerinizi bulut tabanlı sistemimize yükleyin, etiket setleri oluşturun ve verilerinizi ilanlara bağlamaya hazır hale getirin.
              </p>
            </article>

            <!-- Feature 2 -->
            <article class="bg-white dark:bg-[#1e293b] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-[#334155] hover:shadow-lg transition-shadow">
              <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6" aria-hidden="true">
                <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">2. İlan ve Sözleşme Akışı</h3>
              <p class="text-gray-600 dark:text-slate-400 leading-relaxed">
                Projeniz için ilan açın, gelen başvuruları değerlendirin. Seçtiğiniz etiketleyicilerle dijital sözleşme oluşturarak görevleri atayın.
              </p>
            </article>

            <!-- Feature 3 -->
            <article class="bg-white dark:bg-[#1e293b] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-[#334155] hover:shadow-lg transition-shadow relative overflow-hidden">
              <div class="absolute top-0 right-0 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">CORE</div>
              <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mb-6" aria-hidden="true">
                <svg class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Desktop Etiketleme</h3>
              <p class="text-gray-600 dark:text-slate-400 leading-relaxed">
                Etiketleyiciler, özel masaüstü uygulamamız üzerinden yüksek performanslı SAM entegrasyonu ile offline olarak görselleri etiketler.
              </p>
            </article>

            <!-- Feature 4 -->
            <article class="bg-white dark:bg-[#1e293b] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-[#334155] hover:shadow-lg transition-shadow">
              <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-6" aria-hidden="true">
                <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Kalite Kontrol (QC)</h3>
              <p class="text-gray-600 dark:text-slate-400 leading-relaxed">
                Teslim edilen görevleri web üzerinden görsel arayüzle inceleyin, onaylayın veya revizyon isteyin. Tam kalite kontrol mekanizması.
              </p>
            </article>

            <!-- Feature 5 -->
            <article class="bg-white dark:bg-[#1e293b] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-[#334155] hover:shadow-lg transition-shadow">
              <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mb-6" aria-hidden="true">
                <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Mock/Test Ödeme Akışı</h3>
              <p class="text-gray-600 dark:text-slate-400 leading-relaxed">
                Sözleşmeleri uçtan uca test etmek için mock ödeme ve escrow akışı. (Beta sürecinde gerçek ödeme veya kart bilgisi alınmaz.)
              </p>
            </article>

            <!-- Feature 6 -->
            <article class="bg-white dark:bg-[#1e293b] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-[#334155] hover:shadow-lg transition-shadow">
              <div class="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center mb-6" aria-hidden="true">
                <svg class="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Gelişmiş Export</h3>
              <p class="text-gray-600 dark:text-slate-400 leading-relaxed">
                Onaylanan etiketleri COCO, YOLO veya VOC formatlarında anında dışa aktarın. Doğrudan model eğitimine hazır veriler.
              </p>
            </article>
          </div>
        </section>

        <!-- CTA Section -->
        <section class="relative py-24 overflow-hidden" aria-labelledby="cta-title">
          <div class="absolute inset-0 bg-primary-900"></div>
          <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4MT0iMCIgeTE9IjAiIHgyPSI0MCIgeTI9IjQwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9Ii4wNSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuMDUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cGF0aCBkPSJNMCAwaDQwdjQwSDBWMHptMjAgMjBWMGgyMHYyMEgyMHoiIGZpbGw9InVybCgjYSkiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==')] opacity-20"></div>
          <div class="relative max-w-4xl mx-auto text-center px-4">
            <h2 id="cta-title" class="text-3xl md:text-5xl font-bold text-white mb-6">
              Etiketleme Sürecini Hızlandırın
            </h2>
            <p class="text-primary-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Ücretsiz beta hesabınızı oluşturun, veri etiketleme sürecindeki zorlukları uçtan uca platformumuzla çözün.
            </p>
            <div class="flex flex-col sm:flex-row justify-center gap-4">
              <RouterLink
                to="/register"
                class="inline-flex items-center justify-center px-8 py-4 text-lg font-bold bg-white text-primary-900 rounded-xl hover:bg-gray-50 hover:scale-105 transition-all shadow-xl"
              >
                Ücretsiz Kayıt Ol
              </RouterLink>
              <RouterLink
                to="/download"
                class="inline-flex items-center justify-center px-8 py-4 text-lg font-bold bg-primary-800 text-white rounded-xl hover:bg-primary-700 border border-primary-700 hover:border-primary-500 transition-all shadow-xl"
              >
                Desktop İndir
              </RouterLink>
            </div>
          </div>
        </section>
      </div>
    </div>
  </PublicLayout>
</template>