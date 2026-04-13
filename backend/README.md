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
| **Hashing** | fast-json-stable-stringify | ^2.x |
| **Concurrency** | p-limit | ^6.x |
| **Image Proc** | Sharp | ^0.33.x |
| **Auth** | JWT (httpOnly cookie) + bcrypt | ^9.0.3 / ^6.0.0 |
| **Validation** | Joi | ^18.0.2 |
| **Security** | Helmet, Rate Limiting | ^8.1.0 / ^6.11.2 |
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
│   │   ├── asset.worker.ts         # BullMQ worker for image processing
│   │   └── normalize.worker.ts     # BullMQ worker for annotation normalization
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
│   ├── utils/             # Utility functions & custom error classes
│   │   ├── errors.ts      # Custom error classes
│   │   └── normalize.util.ts  # Normalize raw → normalized transform (MVP: identity)
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
| POST | `/register` | Yeni kullanıcı kaydı (httpOnly cookie set) |
| POST | `/login` | Kullanıcı girişi (httpOnly cookie set) |
| POST | `/logout` | Çıkış (cookie temizle) |
| GET | `/profile` | Profil bilgisi (Auth) |

### Admin Routes (`/api/v1/admin`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/users` | Tüm kullanıcıları listele |
| GET | `/users/:id` | Kullanıcı detayı |
| PATCH | `/users/:id` | Kullanıcı güncelle |
| DELETE | `/users/:id` | Kullanıcı sil |

### Dataset Routes (`/api/v1/datasets`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Kullanıcının datasetleri (`?search=` ile isim araması destekler) |
| GET | `/:id` | Dataset detayı |
| POST | `/` | Yeni dataset oluştur |
| PUT | `/:id` | Dataset güncelle |
| PATCH | `/:id` | Dataset güncelle |
| DELETE | `/:id` | Dataset sil |

### Asset Routes (`/api/v1/assets`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Assetleri listele |
| GET | `/:id` | Asset detayı (signed URL ile) |
| POST | `/initiate` | Görsel yükleme başlat ( URL dön ) |
| POST | `/:id/confirm` | Yüklemeyi onayla ve işlemeye al |
| PUT | `/:id` | Asset güncelle |
| DELETE | `/:id` | Asset sil (MinIO/R2 + DB) |

### LabelSet Routes (`/api/v1/labelsets`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Kullanıcının label setleri |
| GET | `/:id` | LabelSet detayı |
| POST | `/` | Yeni LabelSet oluştur |
| POST | `/:id/labels` | LabelSet'e etiket ekle |
| PUT | `/:id` | LabelSet güncelle (isim ve/veya etiketleri değiştir) |
| DELETE | `/:id` | LabelSet sil |

> **Not:** Bir Listing tarafından kullanılan Dataset'ler, Asset'ler ve LabelSet'ler güncellenemez ve silinemez (usage guard).

### Listing Routes (`/api/v1/listings`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Tüm açık ilanlar (`?search=` ile başlık araması destekler) |
| GET | `/:id` | İlan detayı |
| POST | `/` | Yeni ilan oluştur |
| PUT | `/:id` | İlan güncelle |
| PATCH | `/:id` | İlan güncelle |
| DELETE | `/:id` | İlan sil |
| GET | `/:listingId/proposals` | İlanın başvuruları |

> **Not:** Görev oluşturma (task generation) artık başvuru kabul akışı (`acceptProposal`) içinde atomik olarak gerçekleşir. Ayrı bir `generate-tasks` endpoint'i yoktur.

> **Cache:** Listings için Redis cache (`cacheMiddleware`) kullanılır.

### Proposal Routes (`/api/v1/proposals`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/` | İlana başvur (sadece labeler/admin — client 403 alır) |
| GET | `/` | Başvuruları listele |
| GET | `/:id` | Başvuru detayı |
| PATCH | `/:id/accept` | Başvuruyu kabul et → Contract + Tasks oluşur |
| PATCH | `/:id/reject` | Başvuruyu reddet |
| PATCH | `/:id/withdraw` | Başvuruyu geri çek (labeler) |

> **Mimari Not:** `acceptProposal` — sözleşme oluşturmanın tek kanonik yoludur. Transaction içinde: Proposal kabul → Contract oluştur → Dataset asset'leri için Task'lar oluştur → Diğer başvuruları reddet → Listing status `in_progress`'e güncelle

### Contract Routes (`/api/v1/contracts`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Kullanıcının sözleşmeleri (role-based: client→clientUserId, labeler→labelerUserId) |
| GET | `/:id` | Sözleşme detayı |
| GET | `/:id/labeling-context` | Sözleşmeye ait etiketleme metadatasını (context) döner |
| GET | `/:id/qc-sample` | QC sample task seti al (client/admin, `?size=100`) |
| PATCH | `/:id/submit` | Sözleşmeyi teslim et (labeler) → normalize job enqueue |
| PATCH | `/:id/approve` | Sözleşmeyi onayla (client) — normalize completed gerektirir |
| PATCH | `/:id/reject` | Sözleşmeyi revision_requested'a çevir (client) — task statülerini sıfırlar |
| PATCH | `/:id/cancel` | Sözleşmeyi iptal et |
| POST | `/:id/normalize-retry` | Normalize job'ı tekrar enqueue et (admin only) |

> **Mimari Not:** Doğrudan `POST /contracts` endpoint'i yoktur. Contract oluşturma yalnızca `PATCH /proposals/:id/accept` ile gerçekleşir.

### Task Routes (`/api/v1/tasks`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Tüm görevleri (tasks) listele |
| POST | `/lease-batch` | Toplu görev kilitle (Desktop App, active/revision_requested contract) |
| GET | `/:id` | Görev detayı |
| GET | `/:id/qc-view` | QC inceleme görünümü (asset + raw + normalized + labelSet) |
| GET | `/:id/annotations` | Görevin annotation'ları (raw + normalized) |
| POST | `/:id/lease` | Görevi kilitle (race-safe, DB constraint ile) |
| POST | `/:id/submit` | Görevi teslim et — **tam snapshot** (atomic, idempotent via payloadHash) |
| PATCH | `/:id/accept` | Görevi onayla (QC) |
| PATCH | `/:id/reject` | Görevi reddet (QC) |
| POST | `/release-expired` | Süresi dolan kilitleri kaldır (admin) |

> **Snapshot Semantiği:** `POST /:id/submit` her çağrıda görevin **tamamen nihai annotation**'ını bekler (partial patch değil). Normalize worker her görev için en son geçerli raw kaydı kullanır.
> 
> **Lease Semantiği:** Görev kilit işlemleri (`POST /:id/lease` ve `POST /lease-batch`), süresi dolmuş (`leasedUntil <= now`) veya asılı kalmış (stale row) kilitleri otomatik olarak üzerine yazarak (reclaim) sisteme kazandırır. `POST /release-expired` yalnızca yardımcı bir admin opsiyonudur, normal işleyişte gerekli değildir.
>
> **QC View Payload İşleme Notu:** `/:id/qc-view` endpointinden dönen verilerdeki annotation payload'ları frontend tarafında akıllıca parse edilir. Örn: `{ type: "export", data: [...] }` formatındaki envelope (zarf) tipli objeler frontend parser (`extractAnnotationShapes`) tarafından artık otomatik ayırt edilip içindeki array üzerinden işlenmektedir. Herhangi bir ekstra backend string manipulation'a gerek kalmadan JSON formatındaki raw/normalized annotation payload'unu olduğu gibi iletmeniz yeterlidir.


### Annotation Routes (`/api/v1/annotations`) 🔒 Admin Only

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/raw` | Ham annotation kaydet (debug/reprocess — admin only, leaseToken yok) |
| POST | `/normalize` | Normalize annotation kaydet (debug — admin only, object veya array kabul eder) |

> **İki Ayrı Annotation Akışı:**
> - **Kanonik labeler akışı:** `POST /tasks/:id/submit` — leaseToken ile raw kayıt oluşturur → normalize pipeline'a dahil
> - **Admin debug akışı:** `POST /annotations/raw` — leaseToken olmadan kayıt oluşturur → normalize worker tarafından yok sayılır (`lease_token IS NOT NULL` filtresi)

### Review Routes (`/api/v1/reviews`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Tüm review'ları getir |
| POST | `/` | Yeni review oluştur |
| GET | `/:id` | Review detayı |
| PATCH | `/:id/resolve` | Review çöz/güncelle |

## 🗄️ Veritabanı Şeması

17 model ile kapsamlı ilişkisel yapı:

### Core Models
- **User** - Kullanıcılar (client, labeler, admin rolleri)
- **Dataset** - Müşteri veri setleri (draft, uploading, ready, archived)
- **Asset** - Dataset içindeki görseller (pending, uploaded, processing, ready, error)

### Labeling Models
- **LabelSet** - Etiket sınıfları seti (versiyonlanabilir)
- **Label** - LabelSet içindeki tek etiket

### Marketplace Models
- **Listing** - Etiketleme ilanları (open, in_progress, completed, cancelled) — Toplam fiyat modeli (`priceTotal`), `annotationFormat` enum (COCO/YOLO/VOC/Custom), `qcMode` (none, client_approval, internal_reviewer)
- **Proposal** - İlan başvuruları (pending, accepted, rejected, withdrawn) 
- **Contract** - İş sözleşmeleri (active, submitted, approved, revision_requested, cancelled) — `revisionReason`, `revisionRequestedAt`, `revisionCount` alanları ile revizyon takibi. Submit → async normalize → QC → approve/reject pipeline'ı
- **Submission** - Normalize pipeline tracking (pending, processing, completed, failed) — contract submit'te oluşturulur, normalize worker tarafından güncellenir

### Task Models
- **Task** - En küçük iş birimi (1 asset = 1 task) (ready, leased, submitted, accepted, rejected)
- **TaskLease** - Görev kilitleme sistemi

### Annotation Models
- **AnnotationRaw** - Ham annotation verisi (JSON) — `payloadHash` (NOT NULL, SHA-256) ile idempotency, `leaseToken` ile audit trail, `@@unique([taskId, payloadHash])` constraint
- **AnnotationNormalized** - Normalize edilmiş format — `version` ile versiyonlama, `updatedAt` ile güncelleme takibi

### Payment Models
- **Payment** - Ödeme kayıtları (pending, paid, failed, refunded)
- **EscrowLedger** - Para hareketi muhasebesi (hold, release_to_labeler, refund_to_client, platform_fee)

### System Models
- **AuditLog** - Denetim logları
- **Review** - QC review kayıtları (accept, reject)

## 🛡️ Middleware Pipeline

```text
Request 
  → Trust Proxy (if set) 
  → Security (Helmet/CORS) 
  → Body Parsers (JSON/Urlencoded) 
  → Cookie Parser 
  → Request Logger 
  → Rate Limiting 
  → API Routes (Auth (JWT via httpOnly cookie) → Role Check → Validation → Controller) 
  → Error Handler (Not Found / Global Error)
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

JWT tabanlı authentication sistemi (`httpOnly` cookie):

1. **Register/Login** → Sunucu JWT'yi `httpOnly`, `secure`, `SameSite=lax` cookie olarak set eder
2. **Her istekte** → Tarayıcı cookie'yi otomatik gönderir (frontend `withCredentials: true`)
3. **Logout** → `POST /api/v1/auth/logout` cookie'yi temizler
4. **Token expire** → Yeniden login gerekli

> **Not:** Token artık response body'de dönmez ve `localStorage`'da tutulmaz — XSS saldırılarına karşı güvenli.

## 📊 Rol Tabanlı Erişim

| Rol | Erişim Hakları |
|-----|----------------|
| **admin** | Tüm endpointlere erişim, kullanıcı yönetimi, normalize retry, debug annotation |
| **client** | Dataset, listing yönetimi, proposal kabul/red, contract QC (approve/reject). Proposal oluşturamaz (403). Sadece kendi `clientUserId` ile eşleşen sözleşmeleri görür. |
| **labeler** | İlanları görüntüleme, proposal oluşturma, görev lease/submit. Sadece kendi `labelerUserId` ile eşleşen sözleşmeleri görür. |
