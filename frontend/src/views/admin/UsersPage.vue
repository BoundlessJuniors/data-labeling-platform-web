<script setup lang="ts">
import { ref, onMounted } from 'vue'
import apiClient from '@/api/client'

interface User {
  id: string
  email: string
  displayName: string | null
  role: 'client' | 'labeler' | 'admin'
  createdAt: string
  _count: {
    datasets: number
    listingsOwned: number
    contractsAsClient: number
    contractsAsLabeler: number
  }
}

const users = ref<User[]>([])
const loading = ref(true)
const editingUser = ref<User | null>(null)
const newRole = ref('')

async function fetchUsers() {
  loading.value = true
  try {
    const response = await apiClient.get('/admin/users')
    users.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    loading.value = false
  }
}

function openEditModal(user: User) {
  editingUser.value = user
  newRole.value = user.role
}

async function updateUserRole() {
  if (!editingUser.value) return
  
  try {
    await apiClient.patch(`/admin/users/${editingUser.value.id}`, {
      role: newRole.value
    })
    await fetchUsers()
    editingUser.value = null
  } catch (error) {
    console.error('Failed to update user:', error)
  }
}

async function deleteUser(id: string) {
  if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return
  
  try {
    await apiClient.delete(`/admin/users/${id}`)
    await fetchUsers()
  } catch (error) {
    console.error('Failed to delete user:', error)
  }
}

function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'admin': return 'badge-error'
    case 'client': return 'badge-info'
    case 'labeler': return 'badge-success'
    default: return 'badge'
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
      <button @click="fetchUsers" class="btn-secondary">
        Yenile
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kullanıcı
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rol
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              İstatistikler
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kayıt Tarihi
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <div>
                <div class="text-sm font-medium text-gray-900">
                  {{ user.displayName || 'İsimsiz' }}
                </div>
                <div class="text-sm text-gray-500">{{ user.email }}</div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getRoleBadgeClass(user.role)">
                {{ user.role }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <div v-if="user.role === 'client'">
                {{ user._count.datasets }} dataset, {{ user._count.listingsOwned }} listing
              </div>
              <div v-else-if="user.role === 'labeler'">
                {{ user._count.contractsAsLabeler }} contract
              </div>
              <div v-else>-</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(user.createdAt).toLocaleDateString('tr-TR') }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button @click="openEditModal(user)" class="text-primary-600 hover:text-primary-900 mr-4">
                Düzenle
              </button>
              <button @click="deleteUser(user.id)" class="text-red-600 hover:text-red-900">
                Sil
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit Modal -->
    <div v-if="editingUser" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Kullanıcı Düzenle</h3>
        
        <div class="mb-4">
          <p class="text-sm text-gray-600">{{ editingUser.email }}</p>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select v-model="newRole" class="input">
            <option value="client">Client</option>
            <option value="labeler">Labeler</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div class="flex justify-end space-x-3">
          <button @click="editingUser = null" class="btn-secondary">
            İptal
          </button>
          <button @click="updateUserRole" class="btn-primary">
            Kaydet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
