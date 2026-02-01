# Data Labeling Platform - Frontend

Vue 3 + Tailwind CSS ile oluşturulmuş görsel veri etiketleme platformu kullanıcı arayüzü.

## 🛠️ Teknoloji Stack

| Kategori | Teknoloji | Versiyon |
|----------|-----------|----------|
| **Framework** | Vue 3 | ^3.5.24 |
| **Build Tool** | Vite | ^7.2.4 |
| **Type System** | TypeScript | ~5.9.3 |
| **Styling** | Tailwind CSS | ^3.4.19 |
| **State Management** | Pinia | ^3.0.4 |
| **Routing** | Vue Router | ^4.6.4 |
| **HTTP Client** | Axios | ^1.13.4 |

## 📋 Gereksinimler

- Node.js 18+
- npm veya yarn
- Backend API çalışıyor olmalı (`http://localhost:3000`)

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Environment variables
cp .env.example .env

# Development server başlat
npm run dev
```

**UI:** `http://localhost:5173`

## 📁 Proje Yapısı

```
frontend/
├── public/                   # Static assets
├── src/
│   ├── api/                  # API katmanı
│   │   ├── client.ts         # Axios instance & interceptors
│   │   └── auth.ts           # Auth API fonksiyonları
│   │
│   ├── stores/               # Pinia state management
│   │   └── auth.ts           # Authentication store
│   │
│   ├── router/               # Vue Router
│   │   └── index.ts          # Route tanımları & guards
│   │
│   ├── layouts/              # Layout bileşenleri
│   │   └── AdminLayout.vue   # Admin panel layout
│   │
│   ├── components/           # Reusable bileşenler
│   │   └── HelloWorld.vue    # Örnek bileşen
│   │
│   ├── views/                # Sayfa bileşenleri
│   │   ├── HomePage.vue          # Landing page
│   │   ├── LoginPage.vue         # Giriş sayfası
│   │   ├── RegisterPage.vue      # Kayıt sayfası
│   │   ├── DashboardRedirect.vue # Role-based yönlendirme
│   │   ├── NotFoundPage.vue      # 404 sayfası
│   │   │
│   │   ├── admin/            # Admin sayfaları
│   │   │   └── UsersPage.vue     # Kullanıcı yönetimi
│   │   │
│   │   ├── client/           # Client (Veri Sahibi) sayfaları
│   │   │   ├── DatasetsPage.vue  # Dataset yönetimi
│   │   │   ├── ListingsPage.vue  # İlan yönetimi
│   │   │   └── ContractsPage.vue # Sözleşme yönetimi
│   │   │
│   │   └── labeler/          # Labeler sayfaları
│   │       ├── AvailableListingsPage.vue # Mevcut ilanlar
│   │       ├── MyContractsPage.vue       # Sözleşmelerim
│   │       └── TasksPage.vue             # Görevlerim
│   │
│   ├── assets/               # Proje assets
│   ├── App.vue               # Root component
│   ├── main.ts               # Entry point
│   └── style.css             # Global styles & Tailwind
│
├── index.html                # HTML template
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js         # PostCSS configuration
├── tsconfig.json             # TypeScript config
└── package.json              # Dependencies
```

## 🧭 Route Yapısı

### Public Routes (Herkes Erişebilir)

| Route | Sayfa | Açıklama |
|-------|-------|----------|
| `/` | HomePage | Landing page, platform tanıtımı |
| `/login` | LoginPage | Kullanıcı girişi |
| `/register` | RegisterPage | Yeni kullanıcı kaydı |

### Protected Routes (Giriş Gerekli)

| Route | Rol | Açıklama |
|-------|-----|----------|
| `/dashboard` | Tümü | Role göre yönlendirme |
| `/admin/users` | Admin | Kullanıcı listesi & yönetim |
| `/client/datasets` | Client | Dataset CRUD işlemleri |
| `/client/listings` | Client | İlan CRUD işlemleri |
| `/client/contracts` | Client | Sözleşme yönetimi |
| `/labeler/listings` | Labeler | Mevcut ilanları görüntüle |
| `/labeler/contracts` | Labeler | Sözleşmelerimi görüntüle |
| `/labeler/tasks` | Labeler | Görevlerimi yönet |

## 🔐 Authentication Sistemi

### Auth Store (`stores/auth.ts`)

Pinia store ile merkezi authentication yönetimi:

```typescript
// Store özellikleri
- user: User | null          // Giriş yapmış kullanıcı
- token: string | null       // JWT token
- isAuthenticated: boolean   // Giriş durumu

// Actions
- login(email, password)     // Giriş yap
- register(data)             // Kayıt ol
- logout()                   // Çıkış yap
- fetchProfile()             // Profil bilgisi al
```

### Navigation Guards

Router seviyesinde güvenlik:

- **requiresAuth:** Giriş yapılmadan erişilemez
- **guest:** Sadece giriş yapmamış kullanıcılar
- **role:** Belirli role sahip kullanıcılar

## 🎨 Styling Sistemi

### Tailwind CSS Konfigürasyonu

```javascript
// tailwind.config.js
{
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Özel renkler ve spacing eklenebilir
    }
  }
}
```

### Custom Styles (`style.css`)

```css
/* Tailwind base */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom component styles */
```

## 🔌 API Entegrasyonu

### Axios Client (`api/client.ts`)

```typescript
// Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Interceptors
- Request: JWT token ekleme
- Response: 401 hata yakalama → logout
```

### API Fonksiyonları (`api/auth.ts`)

```typescript
// Auth endpoints
- login(email, password)     // POST /api/auth/login
- register(data)             // POST /api/auth/register
- getProfile()               // GET /api/auth/profile
```

## 🚧 Geliştirme Planı

### Tamamlanan Özellikler ✅

- [x] Vue 3 + Vite proje kurulumu
- [x] Tailwind CSS entegrasyonu
- [x] Vue Router kurulumu ve guard'lar
- [x] Pinia store (auth)
- [x] Axios client & interceptors
- [x] Login/Register sayfaları
- [x] HomePage (landing page)
- [x] Role-based routing
- [x] Admin/Client/Labeler sayfa iskeletleri

### Geliştirme Bekleyen Özellikler 🔄

- [ ] Dataset yönetim arayüzü (CRUD)
- [ ] Listing oluşturma & düzenleme formları
- [ ] Asset upload bileşeni
- [ ] LabelSet yönetimi
- [ ] Annotation editörü (canvas-based)
- [ ] Task assignment & workflow
- [ ] Real-time bildirimler
- [ ] Payment dashboard
- [ ] Admin analytics sayfası
- [ ] Dark mode desteği

## 📦 Bileşen Geliştirme Rehberi

### Yeni Sayfa Ekleme

1. `src/views/` altına Vue dosyası oluştur
2. `src/router/index.ts`'e route ekle
3. Gerekirse navigation guard ekle

```typescript
// Örnek route ekleme
{
  path: '/client/new-page',
  name: 'client-new-page',
  component: () => import('@/views/client/NewPage.vue'),
  meta: { requiresAuth: true, role: 'client' }
}
```

### Yeni Store Ekleme

```typescript
// src/stores/example.ts
import { defineStore } from 'pinia'

export const useExampleStore = defineStore('example', {
  state: () => ({
    items: []
  }),
  actions: {
    async fetchItems() {
      // API call
    }
  }
})
```

### API Fonksiyonu Ekleme

```typescript
// src/api/datasets.ts
import client from './client'

export const datasetApi = {
  getAll: () => client.get('/datasets'),
  getById: (id: string) => client.get(`/datasets/${id}`),
  create: (data: object) => client.post('/datasets', data),
  update: (id: string, data: object) => client.put(`/datasets/${id}`, data),
  delete: (id: string) => client.delete(`/datasets/${id}`)
}
```

## 🧪 Test

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production
npm run preview
```

## 📜 NPM Komutları

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Development server (HMR) |
| `npm run build` | Production build |
| `npm run preview` | Production build önizleme |

## 🔧 Environment Variables

`.env.example` dosyasını `.env` olarak kopyala:

```env
VITE_API_URL=http://localhost:3000/api
```

## 📝 Kod Standartları

- **Vue 3 Composition API** tercih edilir
- **TypeScript** zorunlu
- **Single File Components** (SFC) formatı
- Dosya isimleri: `PascalCase.vue`
- Bileşen isimleri: `PascalCase`
- Props/Emits: `camelCase`

## 🤝 Backend API Bağlantısı

Frontend, backend API'ye şu endpoint'ler üzerinden bağlanır:

| Endpoint Group | Base Path | Kullanım Yeri |
|----------------|-----------|---------------|
| Auth | `/api/auth` | Login, Register, Profile |
| Datasets | `/api/datasets` | Client sayfaları |
| Assets | `/api/assets` | Dataset detay |
| Listings | `/api/listings` | Client & Labeler |
| Contracts | `/api/contracts` | Client & Labeler |
| Tasks | `/api/tasks` | Labeler görevleri |
| Admin | `/api/admin` | Admin sayfaları |

Detaylı API dokümantasyonu için: [Backend README](../backend/README.md)
