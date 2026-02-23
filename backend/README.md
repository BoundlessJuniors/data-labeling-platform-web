# Data Labeling Platform - Backend API

Görsel veri etiketleme platformu için RESTful API.

## 🛠️ Tech Stack

| Kategori | Teknoloji | Versiyon |
|----------|-----------|----------|
| **Runtime** | Node.js + TypeScript | TS ~5.6.3 |
| **Framework** | Express.js | ^4.21.0 |
| **ORM** | Prisma | ^5.22.0 |
| **Database** | PostgreSQL | 16-alpine |
| **Cache** | Redis (ioredis) | ^5.9.2 |
| **Queue** | BullMQ | ^5.x |
| **Image Proc** | Sharp | ^0.33.x |
| **Auth** | JWT + bcrypt | ^9.0.3 / ^6.0.0 |
| **Validation** | Joi | ^18.0.2 |
| **Security** | Helmet, Rate Limiting | ^8.1.0 / ^8.2.1 |
| **Logging** | Winston | ^3.19.0 |
| **Storage** | MinIO (local) / Cloudflare R2 (prod) — AWS S3 SDK | ^3.x |
| **Upload** | Direct-to-R2 (Presigned URLs) | - |

## 🚀 Hızlı Kurulum

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

**API:** `http://localhost:3000`

## 📁 Proje Yapısı

```
backend/
├── prisma/
│   ├── schema.prisma      # 17 model tanımı (Proposal, Submission eklendi)
│   ├── migrations/        # Database migrations
│   └── seed.ts            # Seed data script
│
├── src/
│   ├── controllers/       # 11 API endpoint handler
│   │   ├── auth.controller.ts
│   │   ├── admin.controller.ts
│   │   ├── dataset.controller.ts
│   │   ├── asset.controller.ts
│   │   ├── labelset.controller.ts
│   │   ├── listing.controller.ts
│   │   ├── contract.controller.ts
│   │   ├── proposal.controller.ts
│   │   ├── task.controller.ts
│   │   ├── annotation.controller.ts
│   │   └── review.controller.ts
│   │
│   ├── services/          # Business Logic Layer
│   │   ├── auth.service.ts
│   │   ├── admin.service.ts
│   │   ├── dataset.service.ts
│   │   ├── asset.service.ts
│   │   ├── labelset.service.ts
│   │   ├── listing.service.ts
│   │   ├── contract.service.ts
│   │   ├── proposal.service.ts
│   │   ├── task.service.ts
│   │   ├── annotation.service.ts
│   │   └── review.service.ts
│   │
│   ├── workers/           # Background Workers
│   │   └── asset.worker.ts         # BullMQ worker for image processing
│   │
│   ├── routes/            # Express route tanımları
│   │   ├── index.ts       # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── admin.routes.ts
│   │   ├── dataset.routes.ts
│   │   ├── asset.routes.ts
│   │   ├── labelset.routes.ts
│   │   ├── listing.routes.ts
│   │   ├── contract.routes.ts
│   │   ├── proposal.routes.ts  # YENİ
│   │   ├── task.routes.ts
│   │   ├── annotation.routes.ts
│   │   └── review.routes.ts
│   │
│   ├── middlewares/       # 9 Express middleware
│   │   ├── auth.middleware.ts        # JWT doğrulama
│   │   ├── role.middleware.ts        # Rol tabanlı erişim
│   │   ├── validate.middleware.ts    # Joi validation
│   │   ├── error.middleware.ts       # Global error handler
│   │   ├── cache.middleware.ts       # Redis cache
│   │   ├── upload.middleware.ts      # Multer file upload (MinIO/R2)
│   │   ├── rate-limit.middleware.ts  # Rate limiting
│   │   ├── security.middleware.ts    # Helmet & CORS
│   │   └── request-logger.middleware.ts
│   │
│   ├── validators/        # Joi validation schemas
│   ├── lib/               # Shared libraries
│   │   ├── db.ts          # Prisma Client
│   │   ├── redis.ts       # Redis connection
│   │   ├── queue.ts       # BullMQ setup
│   │   ├── storage.ts     # MinIO/R2 Storage Utils
│   │   └── logger.ts      # Winston logger
│   ├── utils/             # Custom error classes
│   └── index.ts           # App entry point
│
├── package.json
└── tsconfig.json
```

## 🏗️ Mimari

Proje **Service Layer Pattern** kullanılarak geliştirilmiştir:

- **Controllers:** Sadece HTTP istek/cevap döngüsünden ve validasyondan sorumludur.
- **Services:** Tüm iş mantığını (business logic) ve veritabanı etkileşimlerini barındırır.
- **Workers:** Uzun süren işlemleri (görsel işleme vb.) arka planda asenkron olarak yürütür.
- **Routes:** Endpoint tanımlamalarını ve middleware zincirlerini içerir.

Bu yapı sayesinde iş mantığı controller'lardan ayrıştırılmış, test edilebilir ve yeniden kullanılabilir hale getirilmiştir.

## 🔌 API Endpoints

### Auth Routes (`/api/v1/auth`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/register` | Yeni kullanıcı kaydı |
| POST | `/login` | Kullanıcı girişi |
| GET | `/profile` | Profil bilgisi (Auth) |

### Admin Routes (`/api/v1/admin`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/users` | Tüm kullanıcıları listele |
| GET | `/users/:id` | Kullanıcı detayı |
| PUT | `/users/:id` | Kullanıcı güncelle |
| DELETE | `/users/:id` | Kullanıcı sil |
| GET | `/stats` | Platform istatistikleri |

### Dataset Routes (`/api/v1/datasets`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Kullanıcının datasetleri |
| GET | `/:id` | Dataset detayı |
| POST | `/` | Yeni dataset oluştur |
| PUT | `/:id` | Dataset güncelle |
| DELETE | `/:id` | Dataset sil |

### Asset Routes (`/api/v1/assets`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Assetleri listele (datasetId query) |
| GET | `/:id` | Asset detayı (signed URL ile) |
| POST | `/` | Görsel yükle (multipart/form-data → MinIO/R2) |
| PUT | `/:id` | Asset güncelle |
| DELETE | `/:id` | Asset sil (MinIO/R2 + DB) |

### LabelSet Routes (`/api/v1/labelsets`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Kullanıcının label setleri |
| GET | `/:id` | LabelSet detayı |
| POST | `/` | Yeni LabelSet oluştur |
| PUT | `/:id` | LabelSet güncelle |
| DELETE | `/:id` | LabelSet sil |

### Listing Routes (`/api/v1/listings`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Tüm açık ilanlar |
| GET | `/my` | Kullanıcının ilanları |
| GET | `/:id` | İlan detayı |
| POST | `/` | Yeni ilan oluştur |
| PUT | `/:id` | İlan güncelle |
| DELETE | `/:id` | İlan sil |

### Proposal Routes (`/api/v1/proposals`) 🆕

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/` | İlana başvur (labeler) |
| GET | `/` | Başvuruları listele |
| GET | `/:id` | Başvuru detayı |
| PATCH | `/:id/accept` | Başvuruyu kabul et → Contract oluşur |
| PATCH | `/:id/reject` | Başvuruyu reddet |
| PATCH | `/:id/withdraw` | Başvuruyu geri çek (labeler) |
| GET | `/listings/:id/proposals` | İlanın başvuruları |

> **Not:** `acceptProposal` transaction içinde: Proposal kabul → Contract oluştur → Diğer başvuruları reddet → Listing status güncelle

### Contract Routes (`/api/v1/contracts`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Kullanıcının sözleşmeleri |
| GET | `/:id` | Sözleşme detayı |
| POST | `/` | Sözleşme oluştur |
| PUT | `/:id/status` | Sözleşme durumunu güncelle |
| POST | `/:id/submit` | Sözleşmeyi teslim et |
| POST | `/:id/approve` | Sözleşmeyi onayla |
| POST | `/:id/reject` | Sözleşmeyi reddet |

### Task Routes (`/api/v1/tasks`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/contract/:contractId` | Sözleşme görevleri |
| GET | `/:id` | Görev detayı |
| POST | `/:id/lease` | Görevi kilitle |
| POST | `/:id/submit` | Görevi teslim et |
| PUT | `/:id/status` | Görev durumunu güncelle |

### Annotation Routes (`/api/v1/annotations`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/task/:taskId` | Task annotationları |
| POST | `/raw` | Ham annotation kaydet |
| POST | `/normalized` | Normalize annotation kaydet |

### Review Routes (`/api/v1/reviews`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/task/:taskId` | Task reviewları |
| POST | `/` | Yeni review oluştur |

## 🗄️ Veritabanı Şeması

17 model ile kapsamlı ilişkisel yapı:

### Core Models
- **User** - Kullanıcılar (client, labeler, admin rolleri)
- **Dataset** - Müşteri veri setleri (draft, uploading, ready, archived)
- **Asset** - Dataset içindeki görseller

### Labeling Models
- **LabelSet** - Etiket sınıfları seti (versiyonlanabilir)
- **Label** - LabelSet içindeki tek etiket

### Marketplace Models
- **Listing** - Etiketleme ilanları (open, in_progress, completed, cancelled)
- **Proposal** - İlan başvuruları (pending, accepted, rejected, withdrawn) 🆕
- **Contract** - İş sözleşmeleri (active, submitted, approved, rejected)
- **Submission** - Toplu etiket gönderimi (COCO/YOLO import) 🆕

### Task Models
- **Task** - En küçük iş birimi (1 asset = 1 task)
- **TaskLease** - Görev kilitleme sistemi

### Annotation Models
- **AnnotationRaw** - Ham annotation verisi (JSON)
- **AnnotationNormalized** - Normalize edilmiş COCO/YOLO uyumlu format

### Payment Models
- **Payment** - Ödeme kayıtları
- **EscrowLedger** - Para hareketi muhasebesi

### System Models
- **AuditLog** - Denetim logları
- **Review** - QC review kayıtları

## 🛡️ Middleware Pipeline

```
Request → Security (Helmet/CORS) → Rate Limiting → Request Logger 
       → Auth (JWT) → Role Check → Validation → Controller
       → Response / Error Handler
```

## 📜 NPM Komutları

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Development server (ts-node-dev) |
| `npm run build` | TypeScript build |
| `npm run start` | Production server |
| `npm run prisma:generate` | Prisma Client oluştur |
| `npm run prisma:migrate` | Migration çalıştır |
| `npm run prisma:studio` | Prisma Studio GUI |
| `npm run db:seed` | Seed data ekle |

## 🐳 Docker Servisleri

```bash
# Root klasörde çalıştır
docker-compose up -d
```

| Servis | Port | Container |
|--------|------|-----------|
| PostgreSQL | 5433 | data-labeling-postgres |
| Redis | 6379 | data-labeling-redis |
| MinIO | 9000 (API) / 9001 (Console) | data-labeling-minio |

## 🔧 Environment Variables

`.env.example` dosyasını `.env` olarak kopyala:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/data_labeling

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# MinIO / S3-Compatible Storage (replaces Cloudflare R2 in development)
R2_ACCOUNT_ID="minio-local"
R2_ACCESS_KEY_ID="minioadmin"
R2_SECRET_ACCESS_KEY="minioadmin"
R2_BUCKET_NAME="datalabeling"
MINIO_ENDPOINT="http://localhost:9000"
```

## 🔐 Authentication

JWT tabanlı authentication sistemi:

1. **Register/Login** → JWT token al
2. **Her istekte** → `Authorization: Bearer <token>` header'ı gönder
3. **Token expire** → Yeniden login gerekli

## 📊 Rol Tabanlı Erişim

| Rol | Erişim Hakları |
|-----|----------------|
| **admin** | Tüm endpointlere erişim, kullanıcı yönetimi |
| **client** | Dataset, listing, contract yönetimi |
| **labeler** | İlanları görüntüleme, görev yapma |
