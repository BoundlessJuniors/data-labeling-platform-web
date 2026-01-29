import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardRedirect.vue'),
      meta: { requiresAuth: true },
    },
    // Admin routes
    {
      path: '/admin',
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/UsersPage.vue'),
        },
      ],
    },
    // Client routes
    {
      path: '/client',
      meta: { requiresAuth: true, role: 'client' },
      children: [
        {
          path: 'datasets',
          name: 'client-datasets',
          component: () => import('@/views/client/DatasetsPage.vue'),
        },
        {
          path: 'listings',
          name: 'client-listings',
          component: () => import('@/views/client/ListingsPage.vue'),
        },
        {
          path: 'contracts',
          name: 'client-contracts',
          component: () => import('@/views/client/ContractsPage.vue'),
        },
      ],
    },
    // Labeler routes
    {
      path: '/labeler',
      meta: { requiresAuth: true, role: 'labeler' },
      children: [
        {
          path: 'listings',
          name: 'labeler-listings',
          component: () => import('@/views/labeler/AvailableListingsPage.vue'),
        },
        {
          path: 'contracts',
          name: 'labeler-contracts',
          component: () => import('@/views/labeler/MyContractsPage.vue'),
        },
        {
          path: 'tasks',
          name: 'labeler-tasks',
          component: () => import('@/views/labeler/TasksPage.vue'),
        },
      ],
    },
    // 404
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundPage.vue'),
    },
  ],
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Protected routes
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // Guest-only routes (login/register when already logged in)
  if (to.meta.guest && authStore.isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  // Role-based access
  if (to.meta.role) {
    const userRole = authStore.user?.role
    if (userRole !== to.meta.role && userRole !== 'admin') {
      return next({ name: 'dashboard' })
    }
  }

  next()
})

export default router
