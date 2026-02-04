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
| **SEO** | @unhead/vue | ^2.1.2 |
| **Testing** | Vitest + Vue Test Utils | ^4.0.18 |
| **Linting** | ESLint + eslint-plugin-vue | ^9.39.2 |
| **Formatting** | Prettier | ^3.8.1 |

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
├── public/                    # Static assets
│   └── vite.svg
│
├── src/
│   ├── api/                   # API katmanı (7 modül)
│   │   ├── client.ts          # Axios instance & interceptors
│   │   ├── auth.ts            # Auth API fonksiyonları
│   │   ├── datasets.ts        # Dataset API
│   │   ├── assets.ts          # Asset API
│   │   ├── listings.ts        # Listing API
│   │   ├── contracts.ts       # Contract API
│   │   └── tasks.ts           # Task API
│   │
│   ├── stores/                # Pinia state management (8 store)
│   │   ├── auth.ts            # Authentication store
│   │   ├── datasets.ts        # Dataset store
│   │   ├── assets.ts          # Asset store
│   │   ├── listings.ts        # Listing store
│   │   ├── contracts.ts       # Contract store
│   │   ├── tasks.ts           # Task store
│   │   ├── toast.ts           # Toast notifications
│   │   └── __tests__/         # Store testleri
│   │
│   ├── router/                # Vue Router
│   │   └── index.ts           # Route tanımları & guards
│   │
│   ├── layouts/               # Layout bileşenleri (3 layout)
│   │   ├── AppLayout.vue      # Ana uygulama layout
│   │   ├── AdminLayout.vue    # Admin panel layout
│   │   ├── PublicLayout.vue   # Public sayfa layout
│   │   └── index.ts           # Export barrel
│   │
│   ├── components/            # Reusable bileşenler
│   │   ├── ui/                # 8 UI bileşeni
│   │   │   ├── BaseButton.vue
│   │   │   ├── BaseInput.vue
│   │   │   ├── BaseSelect.vue
│   │   │   ├── BaseModal.vue
│   │   │   ├── BasePagination.vue
│   │   │   ├── BaseSkeleton.vue
│   │   │   ├── BaseEmptyState.vue
│   │   │   ├── BaseToast.vue
│   │   │   ├── index.ts
│   │   │   └── __tests__/     # Bileşen testleri
│   │   ├── ToastContainer.vue
│   │   └── HelloWorld.vue
│   │
│   ├── views/                 # Sayfa bileşenleri (15 sayfa)
│   │   ├── HomePage.vue       # Landing page
│   │   ├── LoginPage.vue      # Giriş sayfası
│   │   ├── RegisterPage.vue   # Kayıt sayfası
│   │   ├── DashboardRedirect.vue
│   │   ├── NotFoundPage.vue   # 404 sayfası
│   │   │
│   │   ├── admin/             # Admin sayfaları
│   │   │   ├── AdminDashboardPage.vue
│   │   │   └── UsersPage.vue
│   │   │
│   │   ├── client/            # Client sayfaları
│   │   │   ├── DatasetsPage.vue
│   │   │   ├── DatasetDetailPage.vue
│   │   │   ├── ListingsPage.vue
│   │   │   ├── ContractsPage.vue
│   │   │   └── ContractDetailPage.vue
│   │   │
│   │   └── labeler/           # Labeler sayfaları
│   │       ├── AvailableListingsPage.vue
│   │       ├── MyContractsPage.vue
│   │       └── TasksPage.vue
│   │
│   ├── types/                 # TypeScript type tanımları (9 dosya)
│   │   ├── index.ts           # Export barrel
│   │   ├── api.ts             # API response types
│   │   ├── auth.ts            # Auth types
│   │   ├── dataset.ts         # Dataset types
│   │   ├── asset.ts           # Asset types
│   │   ├── labelset.ts        # LabelSet types
│   │   ├── listing.ts         # Listing types
│   │   ├── contract.ts        # Contract types
│   │   └── task.ts            # Task types
│   │
│   ├── composables/           # Vue composables
│   │
│   ├── assets/                # Proje assets
│   ├── App.vue                # Root component
│   ├── main.ts                # Entry point
│   └── style.css              # Global styles & Tailwind
│
├── index.html                 # HTML template
├── vite.config.ts             # Vite configuration
├── vitest.config.ts           # Vitest test configuration
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.js          # PostCSS configuration
├── eslint.config.js           # ESLint flat config
├── tsconfig.json              # TypeScript config
├── tsconfig.app.json          # App-specific TS config
├── tsconfig.vitest.json       # Vitest TS config
└── package.json
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
| `/admin` | Admin | Admin dashboard |
| `/admin/users` | Admin | Kullanıcı listesi & yönetim |
| `/client/datasets` | Client | Dataset CRUD işlemleri |
| `/client/datasets/:id` | Client | Dataset detay sayfası |
| `/client/listings` | Client | İlan CRUD işlemleri |
| `/client/contracts` | Client | Sözleşme yönetimi |
| `/client/contracts/:id` | Client | Sözleşme detay sayfası |
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
- **guestOnly:** Sadece giriş yapmamış kullanıcılar
- **role:** Belirli role sahip kullanıcılar (admin her yere erişebilir)

## 🎨 UI Bileşen Kütüphanesi

### Base Components (`components/ui/`)

| Bileşen | Açıklama |
|---------|----------|
| `BaseButton` | Çoklu varyant destekli buton |
| `BaseInput` | Form input bileşeni |
| `BaseSelect` | Dropdown select |
| `BaseModal` | Modal dialog |
| `BasePagination` | Sayfalama bileşeni |
| `BaseSkeleton` | Loading skeleton |
| `BaseEmptyState` | Boş durum gösterimi |
| `BaseToast` | Toast notification |

## 🔌 API Entegrasyonu

### Axios Client (`api/client.ts`)

```typescript
// Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Interceptors
- Request: JWT token ekleme
- Response: 401 hata yakalama → logout
```

### API Servisleri

| Servis | Dosya | Endpoint Base |
|--------|-------|---------------|
| Auth | `api/auth.ts` | `/api/auth` |
| Datasets | `api/datasets.ts` | `/api/datasets` |
| Assets | `api/assets.ts` | `/api/assets` |
| Listings | `api/listings.ts` | `/api/listings` |
| Contracts | `api/contracts.ts` | `/api/contracts` |
| Tasks | `api/tasks.ts` | `/api/tasks` |

## 🧪 Test

```bash
# Testleri izleyerek çalıştır
npm run test

# Testleri tek seferlik çalıştır
npm run test:run

# Coverage raporu ile
npm run test:coverage
```

### Test Yapısı

- `src/stores/__tests__/` - Pinia store testleri
- `src/components/ui/__tests__/` - UI bileşen testleri

## 📜 NPM Komutları

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Development server (HMR) |
| `npm run build` | Production build |
| `npm run preview` | Production build önizleme |
| `npm run lint` | ESLint kontrolü |
| `npm run lint:fix` | Lint hatalarını düzelt |
| `npm run format` | Prettier ile formatlama |
| `npm run format:check` | Format kontrolü |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest tek çalıştırma |
| `npm run test:coverage` | Coverage raporu |

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
- ESLint + Prettier ile otomatik formatlama

## 🚧 Geliştirme Durumu

### Tamamlanan Özellikler ✅

- [x] Vue 3 + Vite proje kurulumu
- [x] Tailwind CSS entegrasyonu
- [x] Vue Router kurulumu ve guard'lar
- [x] Pinia store (auth, datasets, assets, listings, contracts, tasks, toast)
- [x] Axios client & interceptors
- [x] Login/Register sayfaları
- [x] HomePage (landing page)
- [x] Role-based routing (admin/client/labeler)
- [x] Admin sayfaları (Dashboard, Users)
- [x] Client sayfaları (Datasets, Listings, Contracts)
- [x] Labeler sayfaları (Listings, Contracts, Tasks)
- [x] 8 reusable UI bileşeni
- [x] Toast notification sistemi
- [x] TypeScript type tanımları
- [x] ESLint + Prettier konfigürasyonu
- [x] Vitest test altyapısı

### Geliştirme Bekleyen Özellikler 🔄

- [ ] Asset upload bileşeni
- [ ] Annotation editörü (canvas-based)
- [ ] Real-time bildirimler
- [ ] Payment dashboard
- [ ] Dark mode desteği

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
