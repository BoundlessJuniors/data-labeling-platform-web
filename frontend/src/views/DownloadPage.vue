<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useSeo } from '@/composables/useSeo';
import PublicLayout from '@/layouts/PublicLayout.vue';
import { downloadsConfig } from '@/config/downloads';

useSeo({
  title: 'Desktop İndir',
  description: 'LabelGun Desktop uygulaması ile etiketleme görevlerini indirin, görselleri yerel olarak etiketleyin ve sonuçları web platformuna senkronize edin.',
});

// Helper to determine OS icon
function getOsIconPath(osId: string): string {
  switch (osId) {
    case 'macos':
      // Apple Logo SVG path (standard)
      return "M16.5,14.6c0-2.7,2.2-4,2.3-4.1c-1.3-1.9-3.2-2.1-3.9-2.2c-1.6-0.2-3.2,1-4,1c-0.8,0-2.1-1-3.5-1c-1.8,0-3.5,1-4.4,2.6 c-1.9,3.3-0.5,8.1,1.3,10.7c0.9,1.3,1.9,2.7,3.3,2.6c1.3-0.1,1.8-0.9,3.4-0.9c1.6,0,2,0.9,3.4,0.9c1.4,0,2.3-1.2,3.2-2.5 c1.1-1.5,1.5-3,1.5-3.1C18.6,18,16.5,17.2,16.5,14.6z M13.8,5.1c0.8-0.9,1.3-2.1,1.1-3.4c-1.1,0.1-2.4,0.7-3.2,1.6 c-0.7,0.8-1.2,2-1,3.3C11.9,6.7,13,6,13.8,5.1z";
    case 'windows':
      // Windows Logo SVG path
      return "M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801";
    case 'linux':
      // Generic Linux Penguin (Tux) path
      return "M15.9 22.5c-.3 0-.7-.1-1.2-.4-.9-.6-2.2-1.2-4.1-1.2-2 0-3.3.6-4.2 1.2-.5.3-.9.4-1.2.4-1.8 0-2.8-1.5-2.2-3.1.2-.5.5-1 .9-1.5.7-1 1.3-2 1.3-2.9 0-.1 0-.1-.1-.1-1.2-.4-2.1-1.6-2.4-3.3-.2-1-.2-2-.2-3.1C2.5 4 6 0 10.6 0c4.5 0 8.1 4 8.1 8.5 0 1.1 0 2.1-.2 3.1-.3 1.7-1.2 2.9-2.4 3.3 0 0-.1.1-.1.1 0 1 .6 1.9 1.3 2.9.4.5.7 1 .9 1.5.6 1.6-.4 3.1-2.3 3.1z";
    default:
      return "M12 4v16m8-8H4"; // Plus icon as fallback
  }
}
</script>

<template>
  <PublicLayout>
    <div class="min-h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        
        <!-- Hero Section -->
        <div class="mb-20 text-center max-w-3xl mx-auto">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium mb-6">
            Desktop Labeling Client <span class="opacity-75 text-xs font-semibold ml-1">Sürüm: {{ downloadsConfig.currentVersion }}</span>
          </div>
          <h1 class="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
            LabelGun Desktop Uygulamasını İndir
          </h1>
          <p class="text-lg md:text-xl text-gray-600 dark:text-slate-400 mb-8 leading-relaxed">
            Etiketleyiciler sözleşme görevlerini indirir, görselleri desktop uygulamada etiketler ve sonuçları web platformuna senkronize eder.
          </p>
          <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-xl text-yellow-800 dark:text-yellow-500 font-medium inline-block mb-10">
            {{ downloadsConfig.releaseStatus }}
          </div>
          <div class="flex flex-col sm:flex-row justify-center gap-4">
            <RouterLink to="/register" class="px-8 py-3 text-lg font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm">
              Kayıt Ol
            </RouterLink>
            <RouterLink to="/" class="px-8 py-3 text-lg font-medium bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white border border-gray-200 dark:border-[#334155] rounded-xl hover:bg-gray-50 dark:hover:bg-[#2dd4bf]/10 transition-colors">
              Ana Sayfaya Dön
            </RouterLink>
          </div>
        </div>

        <!-- Downloads Antigravity-inspired Layout -->
        <div class="grid lg:grid-cols-4 gap-8 lg:gap-12 mb-20 items-start">
          
          <!-- Left Column: Title & Info -->
          <div class="lg:col-span-1">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              İndirme Seçenekleri
            </h2>
            <p class="text-gray-600 dark:text-slate-400 mb-6">
              İşletim sisteminize uygun sürümü seçin. Uygulama, yüksek performanslı yerel etiketleme ve SAM (Segment Anything Model) entegrasyonu içerir.
            </p>
            
            <div class="bg-white dark:bg-[#1e293b] rounded-xl p-5 border border-gray-200 dark:border-[#334155] shadow-sm">
              <h3 class="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Beta Bilgilendirmesi
              </h3>
              <ul class="text-sm text-gray-600 dark:text-slate-400 space-y-3">
                <li>• Desktop build dosyaları hazır olduğunda bu sayfadaki butonlar config üzerinden aktif hale getirilecektir.</li>
                <li>• Gerçek ödeme veya kart bilgisi alınmaz; platform teknik demo/beta test kapsamındadır.</li>
              </ul>
            </div>
          </div>

          <!-- Right Columns: OS Cards -->
          <div class="lg:col-span-3 grid md:grid-cols-3 gap-6">
            <div 
              v-for="platform in downloadsConfig.platforms" 
              :key="platform.id"
              class="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden flex flex-col"
            >
              <!-- Card Header -->
              <div class="p-6 border-b border-gray-100 dark:border-[#334155] bg-gray-50/50 dark:bg-[#1e293b]/50">
                <svg class="w-10 h-10 text-gray-700 dark:text-slate-300 mb-4" viewBox="0 0 24 24" fill="currentColor">
                  <path :d="getOsIconPath(platform.id)"></path>
                </svg>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ platform.name }}</h3>
              </div>

              <!-- Options -->
              <div class="p-6 flex-1 flex flex-col gap-3">
                <div 
                  v-for="option in platform.options" 
                  :key="option.id"
                >
                  <a 
                    v-if="option.enabled && option.href"
                    :href="option.href"
                    download
                    class="flex items-center justify-between p-3 rounded-lg border border-primary-200 dark:border-primary-900/50 bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 transition-colors group"
                  >
                    <span class="font-medium">{{ option.label }}</span>
                    <svg class="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  </a>
                  
                  <!-- Disabled State -->
                  <button 
                    v-else
                    type="button"
                    disabled
                    aria-disabled="true"
                    class="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a]/50 text-gray-500 dark:text-slate-500 cursor-not-allowed"
                  >
                    <span class="font-medium">{{ option.label }}</span>
                    <span class="text-xs font-semibold px-2 py-1 bg-gray-200 dark:bg-[#334155] rounded-md">{{ option.badge || 'Yakında' }}</span>
                  </button>
                </div>
              </div>

              <!-- Minimum Requirements -->
              <div class="px-6 py-4 bg-gray-50 dark:bg-[#0f172a]/80 border-t border-gray-100 dark:border-[#334155] mt-auto">
                <p class="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  <span class="uppercase tracking-wider mr-1">Minimum:</span> {{ platform.minimumRequirements }}
                </p>
              </div>
            </div>
          </div>

        </div>

        <!-- Workflow Section -->
        <div class="mt-24 pt-16 border-t border-gray-200 dark:border-[#334155]">
          <h2 class="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Nasıl Çalışır?
          </h2>
          
          <div class="grid md:grid-cols-4 gap-8 relative">
            <!-- Connecting line (hidden on mobile) -->
            <div class="hidden md:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-gray-200 dark:bg-[#334155] z-0"></div>

            <div class="relative z-10 flex flex-col items-center text-center">
              <div class="w-16 h-16 rounded-2xl bg-white dark:bg-[#1e293b] border-2 border-primary-500 flex items-center justify-center text-primary-600 dark:text-primary-400 text-2xl font-bold mb-4 shadow-sm">1</div>
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Sözleşme Al</h4>
              <p class="text-sm text-gray-600 dark:text-slate-400">Web platformdan etiketleme sözleşmenizi onaylayın.</p>
            </div>

            <div class="relative z-10 flex flex-col items-center text-center">
              <div class="w-16 h-16 rounded-2xl bg-white dark:bg-[#1e293b] border-2 border-primary-500 flex items-center justify-center text-primary-600 dark:text-primary-400 text-2xl font-bold mb-4 shadow-sm">2</div>
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Görevleri İndir</h4>
              <p class="text-sm text-gray-600 dark:text-slate-400">Desktop uygulamasına giriş yapıp görevleri yerel ortama indirin.</p>
            </div>

            <div class="relative z-10 flex flex-col items-center text-center">
              <div class="w-16 h-16 rounded-2xl bg-white dark:bg-[#1e293b] border-2 border-primary-500 flex items-center justify-center text-primary-600 dark:text-primary-400 text-2xl font-bold mb-4 shadow-sm">3</div>
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Etiketle</h4>
              <p class="text-sm text-gray-600 dark:text-slate-400">Gelişmiş araçlar (SAM vb.) kullanarak görselleri offline etiketleyin.</p>
            </div>

            <div class="relative z-10 flex flex-col items-center text-center">
              <div class="w-16 h-16 rounded-2xl bg-white dark:bg-[#1e293b] border-2 border-primary-500 flex items-center justify-center text-primary-600 dark:text-primary-400 text-2xl font-bold mb-4 shadow-sm">4</div>
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Senkronize Et</h4>
              <p class="text-sm text-gray-600 dark:text-slate-400">Tamamlanan işleri web platformuna gönderip teslimi tamamlayın.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  </PublicLayout>
</template>
