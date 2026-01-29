<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const displayName = ref('')
const role = ref<'client' | 'labeler'>('client')
const showError = ref(false)
const validationError = ref('')

onMounted(() => {
  authStore.clearError()
})

async function handleSubmit() {
  showError.value = false
  validationError.value = ''
  
  // Validation
  if (password.value !== confirmPassword.value) {
    validationError.value = 'Şifreler eşleşmiyor'
    return
  }
  
  if (password.value.length < 6) {
    validationError.value = 'Şifre en az 6 karakter olmalıdır'
    return
  }
  
  const success = await authStore.register({
    email: email.value,
    password: password.value,
    role: role.value,
    displayName: displayName.value || undefined,
  })
  
  if (success) {
    router.push('/dashboard')
  } else {
    showError.value = true
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center px-4 py-12">
    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <RouterLink to="/" class="inline-flex items-center space-x-2">
          <div class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-xl">D</span>
          </div>
          <span class="text-2xl font-bold text-gray-900">DataLabel</span>
        </RouterLink>
      </div>

      <!-- Card -->
      <div class="card">
        <h2 class="text-2xl font-bold text-gray-900 text-center mb-6">
          Hesap Oluştur
        </h2>

        <!-- Error Message -->
        <div v-if="validationError || (showError && authStore.error)" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-600">{{ validationError || authStore.error }}</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="displayName" class="block text-sm font-medium text-gray-700 mb-1">
              Görünen Ad (Opsiyonel)
            </label>
            <input
              id="displayName"
              v-model="displayName"
              type="text"
              class="input"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="input"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              minlength="6"
              class="input"
              placeholder="En az 6 karakter"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
              Şifre Tekrar
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              required
              class="input"
              placeholder="Şifreyi tekrar girin"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Hesap Türü
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label
                :class="[
                  'flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all',
                  role === 'client' 
                    ? 'border-primary-600 bg-primary-50 text-primary-700' 
                    : 'border-gray-300 hover:border-gray-400'
                ]"
              >
                <input
                  v-model="role"
                  type="radio"
                  value="client"
                  class="sr-only"
                />
                <div class="text-center">
                  <svg class="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span class="text-sm font-medium">Client</span>
                  <p class="text-xs text-gray-500">Veri etiketletmek istiyorum</p>
                </div>
              </label>
              <label
                :class="[
                  'flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all',
                  role === 'labeler' 
                    ? 'border-primary-600 bg-primary-50 text-primary-700' 
                    : 'border-gray-300 hover:border-gray-400'
                ]"
              >
                <input
                  v-model="role"
                  type="radio"
                  value="labeler"
                  class="sr-only"
                />
                <div class="text-center">
                  <svg class="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span class="text-sm font-medium">Labeler</span>
                  <p class="text-xs text-gray-500">Veri etiketlemek istiyorum</p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            :disabled="authStore.loading"
            class="w-full btn-primary py-3"
          >
            <span v-if="authStore.loading">Kayıt yapılıyor...</span>
            <span v-else>Kayıt Ol</span>
          </button>
        </form>

        <!-- Login Link -->
        <p class="mt-6 text-center text-sm text-gray-600">
          Zaten hesabınız var mı?
          <RouterLink to="/login" class="text-primary-600 hover:text-primary-700 font-medium">
            Giriş Yap
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
