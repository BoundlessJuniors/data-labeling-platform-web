# Data Labeling Platform

Görsel veri etiketleme işlerini yöneten bir pazar yeri platformu. Müşteriler datasetlerini yükleyip etiketleme ilanları açabilir, etiketleyiciler bu ilanları alıp görselleri etiketleyebilir.

## 🏗️ Proje Yapısı

```
data-labeling-platform-web/
├── backend/              # Node.js + Express + Prisma API
│   ├── src/
│   │   ├── controllers/  # 10 API endpoint handler
│   │   ├── routes/       # 10 route modülü
│   │   ├── middlewares/  # 8 middleware (auth, cache, rate-limit...)
│   │   ├── lib/          # Prisma, Redis, Logger
│   │   ├── validators/   # Joi validation schemas
│   │   └── utils/        # Error classes
│   └── prisma/           # Database schema & migrations
│
├── frontend/             # Vue 3 + Tailwind CSS web app
│   ├── src/
│   │   ├── api/          # 7 API service modülü
│   │   ├── components/   # 13+ UI bileşeni
│   │   ├── composables/  # Vue composables
│   │   ├── layouts/      # 3 layout (Admin, App, Public)
│   │   ├── router/       # Role-based routing
│   │   ├── stores/       # 8 Pinia store
│   │   ├── types/        # 9 TypeScript type dosyası
│   │   └── views/        # 15 sayfa bileşeni
│   └── public/           # Static assets
│
├── docker-compose.yml    # PostgreSQL 16 + Redis 7
└── README.md
```

## 🚀 Hızlı Başlangıç

### Ön Gereksinimler

- Node.js 18+
- Docker & Docker Compose
- npm

### 1. Docker Servislerini Başlat (Root Klasörde)

```bash
docker-compose up -d
```

### 2. Backend Kurulum

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

**API:** `http://localhost:3000`

### 3. Frontend Kurulum

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

**UI:** `http://localhost:5173`

## 📚 Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | Vue 3, Tailwind CSS 3.4, Pinia 3, TypeScript 5.9, Vite 7 |
| **Backend** | Node.js, Express 4, TypeScript 5.6 |
| **ORM** | Prisma 5.22 |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Auth** | JWT + bcrypt |
| **Testing** | Vitest (Frontend) |

## 🗄️ Veritabanı Şeması

15 tablo ile kapsamlı veri modeli:

| Tablo | Açıklama |
|-------|----------|
| `users` | Kullanıcılar (client, labeler, admin) |
| `datasets` | Müşteri datasetleri |
| `assets` | Dataset içindeki görseller |
| `label_sets` | Etiket sınıfları seti |
| `labels` | LabelSet içindeki etiketler |
| `listings` | Etiketleme ilanları |
| `contracts` | Labeler-Client sözleşmeleri |
| `tasks` | En küçük iş birimi (1 task = 1 asset) |
| `task_leases` | Task kilitleme mekanizması |
| `annotations_raw` | Ham annotation verileri |
| `annotations_normalized` | Normalize edilmiş annotationlar |
| `payments` | Ödeme kayıtları |
| `escrow_ledger` | Para hareketi muhasebesi |
| `audit_logs` | Denetim logları |
| `reviews` | QC review kayıtları |

## 🔌 API Endpoints

| Grup | Endpoint | Açıklama |
|------|----------|----------|
| Auth | `/api/auth/*` | Kayıt, giriş, profil |
| Datasets | `/api/datasets/*` | Dataset CRUD |
| Assets | `/api/assets/*` | Görsel varlıklar |
| LabelSets | `/api/labelsets/*` | Etiket setleri |
| Listings | `/api/listings/*` | İlanlar |
| Contracts | `/api/contracts/*` | Sözleşmeler |
| Tasks | `/api/tasks/*` | Görevler |
| Annotations | `/api/annotations/*` | Etiketlemeler |
| Reviews | `/api/reviews/*` | QC reviews |
| Admin | `/api/admin/*` | Admin işlemleri |

## 🐳 Docker Servisleri

| Servis | Port | Container | Image |
|--------|------|-----------|-------|
| PostgreSQL | 5433 | data-labeling-postgres | postgres:16-alpine |
| Redis | 6379 | data-labeling-redis | redis:7-alpine |

## 👥 Kullanıcı Rolleri

| Rol | Erişim | Özellikler |
|-----|--------|------------|
| **Admin** | `/admin/*` | Kullanıcı yönetimi, platform istatistikleri |
| **Client** | `/client/*` | Dataset, listing, contract yönetimi |
| **Labeler** | `/labeler/*` | İlanları görüntüleme, görev yapma |

## 📖 Detaylı Dokümantasyon

| Proje | Dokümantasyon |
|-------|---------------|
| **Frontend** | [frontend/README.md](./frontend/README.md) - Kapsamlı geliştirme rehberi |
| **Backend** | [backend/README.md](./backend/README.md) - API ve mimari özeti |

## 📜 Kullanışlı Komutlar

### Backend
```bash
npm run dev              # Development server
npm run build            # Production build
npx prisma studio        # Database görüntüleyici
npx prisma migrate dev   # Yeni migration oluştur
npm run db:seed          # Seed data ekle
```

### Frontend
```bash
npm run dev              # Development server (HMR)
npm run build            # Production build
npm run preview          # Build önizleme
npm run lint             # ESLint kontrolü
npm run lint:fix         # Lint hatalarını düzelt
npm run format           # Prettier ile formatlama
npm run test             # Vitest ile test çalıştır
npm run typecheck        # TypeScript tip kontrolü
```

## 👥 Takım

BoundlessJuniors
