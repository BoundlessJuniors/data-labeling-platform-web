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
│   ├── api/                   # API katmanı (9 modül)
│   │   ├── client.ts          # Axios instance & interceptors
│   │   ├── auth.ts            # Auth API fonksiyonları
│   │   ├── datasets.ts        # Dataset API
│   │   ├── assets.ts          # Asset API (upload dahil)
│   │   ├── listings.ts        # Listing API
│   │   ├── labelsets.ts       # LabelSet API
│   │   ├── proposals.ts       # Proposal API
│   │   ├── contracts.ts       # Contract API
│   │   └── tasks.ts           # Task API
│   │
│   ├── stores/                # Pinia state management (10 store)
│   │   ├── auth.ts            # Authentication store
│   │   ├── datasets.ts        # Dataset store
│   │   ├── assets.ts          # Asset store (upload + progress)
│   │   ├── listings.ts        # Listing store
│   │   ├── labelsets.ts       # LabelSet store
│   │   ├── proposals.ts       # Proposal store
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
│   │   ├── listings/          # İlan kartı bileşenleri
│   │   │   ├── ListingCard.vue
│   │   │   └── ClientListingCard.vue
│   │   ├── proposals/         # Başvuru kartı bileşenleri
│   │   │   └── ProposalCard.vue
│   │   ├── ToastContainer.vue
│   │   └── HelloWorld.vue
│   │
│   ├── views/                 # Sayfa bileşenleri (18 sayfa)
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
│   │   │   ├── DatasetDetailPage.vue   # Görsel yükleme (R2)
│   │   │   ├── LabelSetsPage.vue       # Etiket seti yönetimi (CRUD + edit guard)
│   │   │   ├── ListingsPage.vue        # İlan yönetimi (toplam fiyat, dataset gösterimi)
│   │   │   ├── ListingProposalsPage.vue # Başvuru yönetimi
│   │   │   └── ContractsPage.vue        # Sözleşme yönetimi + progress bar
│   │   │
│   │   └── labeler/           # Labeler sayfaları
│   │       ├── AvailableListingsPage.vue
│   │       ├── MyProposalsPage.vue    # Başvuru takibi (YENİ)
│   │       ├── MyContractsPage.vue
│   │       └── TasksPage.vue
│   │
│   ├── types/                 # TypeScript type tanımları (10 dosya)
│   │   ├── index.ts           # Export barrel
│   │   ├── api.ts             # API response types
│   │   ├── auth.ts            # Auth types
│   │   ├── dataset.ts         # Dataset types
│   │   ├── asset.ts           # Asset types
│   │   ├── labelset.ts        # LabelSet types
│   │   ├── listing.ts         # Listing types (`AnnotationFormat` enum, `CreateListingRequest`, `UpdateListingRequest`)
│   │   ├── proposal.ts        # Proposal types
│   │   ├── contract.ts        # Contract types (agreedPriceTotal, startedAt, tasks[])
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
| `/client/labelsets` | Client | Etiket seti yönetimi (oluştur, düzenle, sil) |
| `/client/listings` | Client | İlan CRUD işlemleri |
| `/client/listings/:id/proposals` | Client | İlan başvurularını görüntüle |
| `/client/contracts` | Client | Sözleşme yönetimi + ilerleme çubuğu |
| `/labeler/listings` | Labeler | Mevcut ilanları görüntüle |
| `/labeler/proposals` | Labeler | Başvurularımı takip et |
| `/labeler/contracts` | Labeler | Sözleşmelerimi görüntüle |
| `/labeler/tasks` | Labeler | Görevlerimi yönet |

## 🔐 Authentication Sistemi

JWT token `httpOnly` cookie ile yönetilir — frontend token'a doğrudan erişmez.

### Auth Store (`stores/auth.ts`)

Pinia store ile merkezi authentication yönetimi:

```typescript
// Store özellikleri
- user: User | null          // Giriş yapmış kullanıcı
- isAuthenticated: boolean   // Giriş durumu (!!user)

// Actions
- login(email, password)     // Giriş yap (cookie sunucu tarafında set edilir)
- register(data)             // Kayıt ol (cookie sunucu tarafında set edilir)
- logout()                   // Çıkış yap (POST /auth/logout ile cookie temizlenir)
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
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

// Config
- withCredentials: true      // httpOnly cookie otomatik gönderilir

// Interceptors
- Response: 401 hata yakalama → logout
```

> **Not:** Token artık `localStorage`'da tutulmaz ve `Authorization` header'ı gönderilmez.

### API Servisleri

| Servis | Dosya | Endpoint Base |
|--------|-------|---------------|
| Auth | `api/auth.ts` | `/api/v1/auth` |
| Datasets | `api/datasets.ts` | `/api/v1/datasets` |
| Assets | `api/assets.ts` | `/api/v1/assets` |
| LabelSets | `api/labelsets.ts` | `/api/v1/labelsets` |
| Proposals | `api/proposals.ts` | `/api/v1/proposals` |
| Listings | `api/listings.ts` | `/api/v1/listings` |
| Contracts | `api/contracts.ts` | `/api/v1/contracts` |
| Tasks | `api/tasks.ts` | `/api/v1/tasks` |

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
VITE_API_URL=http://localhost:3000/api/v1
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
- [x] Asset upload bileşeni (Cloudflare R2)
- [x] LabelSet seçimi (ilan oluşturma)
- [x] LabelSet yönetimi (oluştur, düzenle, sil + kullanım koruması)
- [x] Dataset kullanım koruması (düzenle/sil engelleri, upload kilitleri)
- [x] Dataset Asset yönetimi detay (Toplu görsel silme / Bulk delete özelliği)
- [x] Proposal (başvuru) yönetim sayfası (client)
- [x] Labeler başvuru takip sayfası (`MyProposalsPage.vue`) — durum, fiyat teklifi, geri çekme
- [x] Proposal → Contract lifecycle (başvur → kabul → sözleşme + görev oluşturma)
- [x] Contract type refactoring (`totalPayment` → `agreedPriceTotal`, `active` status)
- [x] Toplam fiyat modeli (`priceTotal`) — ilan oluşturma/düzenleme/listeleme
- [x] İlan kartlarında dataset adı gösterimi
- [x] Düzenleme modalında dataset adı salt-okunur gösterim
- [x] İlan ve başvuru listeleri için modüler/reuseable kart bileşenlerinin oluşturulması (`ListingCard`, `ClientListingCard`, `ProposalCard`)
- [x] `annotationFormat` first-class DB column refactoring (COCO/YOLO/VOC/Custom) — oluşturma ve düzenleme desteği
- [x] `remainingAssets` mock verisi ve progress bar UI borcu temizliği (`ListingCard`, `AvailableListingsPage`)
- [x] Role-based UI refactoring: Client ContractsPage'e progress bar eklendi, Labeler MyContractsPage'den kaldırıldı
- [x] `Contract` type fix: `createdAt` kaldırıldı, `startedAt` non-nullable yapıldı, `tasks[]` eklendi
- [x] Labeler TasksPage `useTasksStore` entegrasyonuna geçirildi (404 hatası düzeltildi)
- [x] `ContractDetailPage.vue` silindi, `client-contract-detail` route kaldırıldı

### Geliştirme Bekleyen Özellikler 🔄

- [ ] Real-time bildirimler
- [ ] Payment dashboard
- [ ] Dark mode desteği

## 🤝 Backend API Bağlantısı

Frontend, backend API'ye şu endpoint'ler üzerinden bağlanır:

| Endpoint Group | Base Path | Kullanım Yeri |
|----------------|-----------|---------------|
| Auth | `/api/v1/auth` | Login, Register, Profile |
| Datasets | `/api/v1/datasets` | Client sayfaları |
| Assets | `/api/v1/assets` | Dataset detay |
| LabelSets | `/api/v1/labelsets` | Etiket seti yönetimi |
| Proposals | `/api/v1/proposals` | Client başvuru yönetimi, Labeler başvuru takibi |
| Listings | `/api/v1/listings` | Client & Labeler |
| Contracts | `/api/v1/contracts` | Client & Labeler |
| Tasks | `/api/v1/tasks` | Labeler görevleri |
| Admin | `/api/v1/admin` | Admin sayfaları |

Detaylı API dokümantasyonu için: [Backend README](../backend/README.md)
