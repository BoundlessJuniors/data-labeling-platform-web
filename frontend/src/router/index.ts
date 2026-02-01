/**
 * Vue Router - Role-based routing with typed meta
 */
import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// Extend route meta types
declare module 'vue-router' {
  interface RouteMeta {
    /** Requires authenticated user */
    requiresAuth?: boolean;
    /** Only accessible to guests (unauthenticated users) */
    guestOnly?: boolean;
    /** Required role to access route (admin can access all) */
    role?: 'admin' | 'client' | 'labeler';
    /** Page title for meta */
    title?: string;
  }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
      meta: { title: 'Ana Sayfa' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue'),
      meta: { guestOnly: true, title: 'Giriş Yap' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterPage.vue'),
      meta: { guestOnly: true, title: 'Kayıt Ol' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardRedirect.vue'),
      meta: { requiresAuth: true, title: 'Dashboard' },
    },
    // Admin routes
    {
      path: '/admin',
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/AdminDashboardPage.vue'),
          meta: { title: 'Admin Dashboard' },
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/UsersPage.vue'),
          meta: { title: 'Kullanıcı Yönetimi' },
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
          meta: { title: 'Datasetler' },
        },
        {
          path: 'datasets/:id',
          name: 'client-dataset-detail',
          component: () => import('@/views/client/DatasetDetailPage.vue'),
          meta: { title: 'Dataset Detay' },
        },
        {
          path: 'listings',
          name: 'client-listings',
          component: () => import('@/views/client/ListingsPage.vue'),
          meta: { title: 'İlanlar' },
        },
        {
          path: 'contracts',
          name: 'client-contracts',
          component: () => import('@/views/client/ContractsPage.vue'),
          meta: { title: 'Sözleşmeler' },
        },
        {
          path: 'contracts/:id',
          name: 'client-contract-detail',
          component: () => import('@/views/client/ContractDetailPage.vue'),
          meta: { title: 'Sözleşme Detay' },
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
          meta: { title: 'Mevcut İlanlar' },
        },
        {
          path: 'contracts',
          name: 'labeler-contracts',
          component: () => import('@/views/labeler/MyContractsPage.vue'),
          meta: { title: 'Sözleşmelerim' },
        },
        {
          path: 'tasks',
          name: 'labeler-tasks',
          component: () => import('@/views/labeler/TasksPage.vue'),
          meta: { title: 'Görevlerim' },
        },
      ],
    },
    // 404
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundPage.vue'),
      meta: { title: 'Sayfa Bulunamadı' },
    },
  ],
});

/**
 * Check if user has access to a route based on role
 */
function hasRoleAccess(to: RouteLocationNormalized, userRole: string | undefined): boolean {
  const requiredRole = to.meta.role;
  if (!requiredRole) return true;
  if (userRole === 'admin') return true; // Admin can access all
  return userRole === requiredRole;
}

// Navigation guards
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;
  const userRole = authStore.user?.role;

  // Check authentication requirement
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({
      name: 'login',
      query: { redirect: to.fullPath },
    });
  }

  // Guest-only routes (redirect to dashboard if authenticated)
  if (to.meta.guestOnly && isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  // Role-based access control
  if (to.meta.requiresAuth && !hasRoleAccess(to, userRole)) {
    return next({ name: 'dashboard' });
  }

  next();
});

export default router;
