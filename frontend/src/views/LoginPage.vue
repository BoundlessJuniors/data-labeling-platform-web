<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showError = ref(false)

onMounted(() => {
  authStore.clearError()
})

async function handleSubmit() {
  showError.value = false
  
  if (!email.value || !password.value) {
    return
  }
  
  const success = await authStore.login({
    email: email.value,
    password: password.value,
  })
  
  if (success) {
    const redirect = route.query.redirect as string
    router.push(redirect || '/dashboard')
  } else {
    showError.value = true
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center px-4">
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
          Giriş Yap
        </h2>

        <!-- Error Message -->
        <div v-if="showError && authStore.error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-600">{{ authStore.error }}</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
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
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            :disabled="authStore.loading"
            class="w-full btn-primary py-3"
          >
            <span v-if="authStore.loading">Giriş yapılıyor...</span>
            <span v-else>Giriş Yap</span>
          </button>
        </form>

        <!-- Register Link -->
        <p class="mt-6 text-center text-sm text-gray-600">
          Hesabınız yok mu?
          <RouterLink to="/register" class="text-primary-600 hover:text-primary-700 font-medium">
            Kayıt Ol
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
