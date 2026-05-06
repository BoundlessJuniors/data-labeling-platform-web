<script setup lang="ts">
/**
 * BetaNotice - Global warning about beta/demo mode
 */
</script>

<template>
  <div class="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200 text-center relative z-50">
    <p class="max-w-7xl mx-auto flex items-center justify-center gap-2">
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>
        <strong>Dikkat:</strong> Bu platform şu anda yalnızca teknik demo ve beta test amacıyla sunulmaktadır. Gerçek ödeme alınmaz; ödeme adımları mock/test akışıyla çalışır. Lütfen kişisel veri, hassas veri, yüz görüntüsü, kimlik belgesi, sağlık verisi, plaka, çocuk görseli veya üçüncü kişilere ait özel veri içeren dosyalar yüklemeyiniz.
      </span>
    </p>
  </div>
</template>
