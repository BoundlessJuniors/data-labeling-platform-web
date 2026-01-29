<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  // Redirect based on user role
  const role = authStore.user?.role
  
  if (role === 'admin') {
    router.replace('/admin/users')
  } else if (role === 'client') {
    router.replace('/client/datasets')
  } else if (role === 'labeler') {
    router.replace('/labeler/listings')
  } else {
    router.replace('/login')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Yönlendiriliyor...</p>
    </div>
  </div>
</template>
