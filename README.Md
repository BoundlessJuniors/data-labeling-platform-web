# Data Labeling Platform

Görsel veri etiketleme işlerini yöneten bir pazar yeri platformu. Müşteriler datasetlerini yükleyip etiketleme ilanları açabilir, etiketleyiciler bu ilanları alıp görselleri etiketleyebilir.

## 🏗️ Proje Yapısı

```
data-labeling-platform-web/
├── backend/              # Node.js + Express + Prisma API
│   ├── src/
│   │   ├── controllers/  # API endpoint handler
│   │   ├── services/     # Business Logic Layer (Service Layer Pattern)
│   │   ├── routes/       # route modülü
│   │   ├── middlewares/  # middleware (auth, cache, rate-limit, upload...)
│   │   ├── lib/          # Prisma, Redis, Logger, MinIO/R2 Storage
│   │   ├── validators/   # Joi validation schemas
│   │   └── utils/        # Error classes
│   └── prisma/           # Database schema & migrations
│
├── frontend/             # Vue 3 + Tailwind CSS web app
│   ├── src/
│   │   ├── api/          # API service modülü
│   │   ├── components/   # UI bileşeni
│   │   ├── composables/  # Vue composables
│   │   ├── layouts/      # layout (Admin, App, Public)
│   │   ├── router/       # Role-based routing
│   │   ├── stores/       # Pinia store
│   │   ├── types/        # TypeScript type dosyası
│   │   └── views/        # sayfa bileşeni
│   └── public/           # Static assets
│
├── docker-compose.yml    # PostgreSQL 16 + Redis 7 + MinIO
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
| **Storage** | MinIO (S3 Compatible, local) / Cloudflare R2 (prod) |
| **ORM** | Prisma 5.22 |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Auth** | JWT (httpOnly cookie) + bcrypt |
| **Testing** | Vitest (Frontend) |

## 🗄️ Veritabanı Şeması

17 tablo ile kapsamlı veri modeli:

| Tablo | Açıklama |
|-------|----------|
| `users` | Kullanıcılar (client, labeler, admin) |
| `datasets` | Müşteri datasetleri |
| `assets` | Dataset içindeki görseller |
| `label_sets` | Etiket sınıfları seti |
| `labels` | LabelSet içindeki etiketler |
| `listings` | Etiketleme ilanları (`annotationFormat` enum: COCO/YOLO/VOC/Custom) |
| `proposals` | İlan başvuruları (Listing Proposals) |
| `contracts` | İş sözleşmeleri (payment-gated, iptal, iade yönetimi) |
| `submissions` | Toplu etiket gönderimi (Dataset Import) |
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
| Auth | `/api/v1/auth/*` | Kayıt, giriş, profil |
| Datasets | `/api/v1/datasets/*` | Dataset CRUD (`?search=` ile isim araması) |
| Assets | `/api/v1/assets/*` | Görsel yükleme (MinIO/R2) & varlıklar |
| LabelSets | `/api/v1/labelsets/*` | Etiket setleri (CRUD + edit guard) |
| Listings | `/api/v1/listings/*` | İlanlar (`?search=` ile başlık araması) |
| Proposals | `/api/v1/proposals/*` | İlan başvuruları (sadece labeler/admin) |
| Contracts | `/api/v1/contracts/*` | Sözleşmeler (yalnızca proposal kabul ile oluşur) |
| Payments | `/api/v1/payments/*` | Mock ödeme iş akışı |
| Tasks | `/api/v1/tasks/*` | Görevler (lease, submit, QC) |
| Annotations | `/api/v1/annotations/*` | Admin debug/reprocess (labeler akışı: `/tasks/:id/submit`) |
| Reviews | `/api/v1/reviews/*` | QC reviews |
| Admin | `/api/v1/admin/*` | Admin işlemleri |

## 🐳 Docker Servisleri

| Servis | Port | Container | Image |
|--------|------|-----------|-------|
| PostgreSQL | 5433 | data-labeling-postgres | postgres:16-alpine |
| Redis | 6379 | data-labeling-redis | redis:7-alpine |
| MinIO | 9000 (API) / 9001 (Console) | data-labeling-minio | minio/minio:latest |

## 👥 Kullanıcı Rolleri

| Rol | Erişim | Özellikler |
|-----|--------|------------|
| **Admin** | `/admin/*` | Tüm erişim, normalize retry, debug annotation |
| **Client** | `/client/*` | Dataset, listing, proposal kabul/red, contract QC. Proposal oluşturamaz. |
| **Labeler** | `/labeler/*` | Proposal oluşturma, görev lease/submit, teslim |

## 📖 Detaylı Dokümantasyon

| Proje | Dokümantasyon |
|-------|---------------|
| **Frontend** | [frontend/README.md](./frontend/README.md) - Kapsamlı geliştirme rehberi |
| **Backend** | [backend/README.md](./backend/README.md) - API ve mimari özeti |
| **Testing** | [docs/lifecycle-regression-checklist.md](./docs/lifecycle-regression-checklist.md) - Regresyon test senaryoları |

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
