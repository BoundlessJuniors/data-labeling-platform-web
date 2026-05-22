# LabelGun - Backend API

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
| **Auth** | Web JWT httpOnly cookie + CSRF; Desktop JWT Bearer token + bcrypt | ^9.0.3 / ^6.0.0 |
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

## 📝 Son Güncellemeler

- **Etiketleyici Puanlama Sistemi:** Onaylanan sözleşmeler için müşteri değerlendirmesi, yıldız puanı ve yorum desteği eklendi.
- **Beta Limitleri ve Davetiye Sistemi:** Kayıt, yükleme, dataset ve sözleşme limitleri ortam değişkenleriyle yönetilebilir hale getirildi; davetiye kodu akışı eklendi.
- **Storage Lifecycle Yönetimi:** Onaylanan sözleşmelerden sonra kaynak görsellerin belirlenen saklama süresi sonunda MinIO/R2 üzerinden temizlenmesi sağlandı.
- **Auth Session Yönetimi:** JWT süresi ile httpOnly cookie süresi tek yapılandırma üzerinden senkronize edildi.
- **QC ve Annotation Akışı:** QC ekranlarında yalnızca kanonik labeler kayıtlarının kullanılması sağlandı; admin debug kayıtları normal pipeline’dan ayrıştırıldı.
- **Lease Yanıt Tutarlılığı:** Görev kilitleme endpoint’lerinde `leaseToken` ve `leasedUntil` alanları istemci tarafı için daha tutarlı hale getirildi.
- **Ödeme Kontrollü Sözleşme Akışı:** Sözleşmelerin ödeme tamamlanmadan aktif iş akışına geçmesi engellendi.
- **Deadline ve İptal Yönetimi:** Süresi dolan ödemeler, geciken sözleşmeler, iade ve ihtilaf akışları için otomasyon ve güvenlik kontrolleri eklendi.
- **Çoklu Şekil Export Desteği:** Bounding box dışında polygon, polyline, keypoint ve circle anotasyonlarının COCO, YOLO ve VOC formatlarında dışa aktarımı desteklendi.
- **Upload ve Storage Güvenliği:** Presigned upload, kota kontrolü, eş zamanlı istek güvenliği, oversized dosya reddi ve purged asset filtreleme mekanizmaları güçlendirildi.
- **Admin Davetiye Yönetimi:** Bekleyen davetiye taleplerinin admin panelinden reddedilebilmesi sağlandı.
- **SonarQube Güvenlik İyileştirmeleri:** Güvenlik hotspot’ları için zayıf rastgelelik kullanımları temizlendi; QC sample seçimi güvenli random üretimiyle güncellendi.
- **CSRF, CORS ve Production Security Hardening:** httpOnly cookie tabanlı auth yapısı için signed CSRF token koruması, strict CORS whitelist, JSON-only unsafe request kontrolü ve production ortamında fail-fast güvenlik konfigürasyonu eklendi.
- **Desktop/Web Auth Ayrımı:** Web tarafı cookie + CSRF modeliyle korunurken Electron desktop istemcisi ayrı `/api/v1/desktop/auth/*` endpointleri ve `Authorization: Bearer` token modeliyle çalışacak şekilde ayrıldı.
- **Admin Operasyonel Güvenlik İyileştirmeleri:** BigInt (Prisma özel tipleri) API response serialization sızıntıları kapatıldı. Queue state'leri (BullMQ) timestamp türetmesinden kurtarılıp gerçek BullMQ listeleriyle etiketlendi. Retry Normalize sadece `submitted` durumu ve kontrollü senaryolara kilitlendi. Süresi dolan lease (stale lease) temizliği görev durumlarını bozmayacak şekilde güvenli hale getirildi ve admin route'larında UUID param doğrulaması (idParamSchema) sağlandı.
- **Redis/BullMQ Free Tier Optimizasyonu:** Upstash Free Tier command kotasını korumak amacıyla BullMQ repeatable job sıklıkları düşürüldü. `deadline-processing` scan default değeri 12 saate, `storage-cleanup` scan default değeri 24 saate çıkarıldı. `DEADLINE_SCAN_INTERVAL_MS` ve `STORAGE_CLEANUP_SCAN_INTERVAL_MS` env değişkenleriyle override mümkündür. Deployment sonrası eski BullMQ repeatable kayıtları yeni schedule uygulanmadan önce otomatik temizlenir (`getRepeatableJobs` + `removeRepeatableByKey`). Ayrıca `/api/v1/assets` endpointleri `cacheMiddleware` kullanmadığı için tüm kod tabanındaki gereksiz `invalidateApiCache('/api/v1/assets')` çağrıları kaldırıldı; dataset cache invalidation korundu.

## 📁 Proje Yapısı

```
backend/
├── prisma/
│   ├── schema.prisma      # 17 model tanımı (Proposal, Submission eklendi)
│   ├── migrations/        # Database migrations
│   └── seed.ts            # Seed data script
│
├── src/
│   ├── config/            # YENİ
│   │   ├── beta-limits.ts     # Beta güvenlik limitleri helper
│   │   ├── security.ts        # Merkezi güvenlik ve cookie konfigürasyonu
│   │   └── upload-security.ts # İzin verilen MIME türleri, uzantı haritası, Sharp format listesi
│   ├── controllers/       # 11 API endpoint handler
│   │   ├── auth.controller.ts
│   │   ├── admin.controller.ts
│   │   ├── dataset.controller.ts
│   │   ├── desktop-auth.controller.ts
│   │   ├── asset.controller.ts
│   │   ├── labelset.controller.ts
│   │   ├── listing.controller.ts
│   │   ├── contract.controller.ts
│   │   ├── proposal.controller.ts
│   │   ├── payment.controller.ts  # YENİ
│   │   ├── task.controller.ts
│   │   ├── annotation.controller.ts
│   │   └── review.controller.ts
│   │
│   ├── services/          # Business Logic Layer
│   │   ├── auth.service.ts
│   │   ├── admin.service.ts
│   │   ├── audit.service.ts       # Faz 3 — Denetim loglama servisi
│   │   ├── dataset.service.ts
│   │   ├── asset.service.ts
│   │   ├── labelset.service.ts
│   │   ├── listing.service.ts
│   │   ├── contract.service.ts
│   │   ├── proposal.service.ts
│   │   ├── payment.service.ts     # YENİ (Ödeme işlemleri)
│   │   ├── deadline.service.ts    # YENİ (SLA ve süre yönetimi)
│   │   ├── payments/              # YENİ (Ödeme sağlayıcıları)
│   │   │   ├── mock-payment.provider.ts
│   │   │   └── payment-provider.interface.ts
│   │   ├── task.service.ts
│   │   ├── annotation.service.ts
│   │   └── review.service.ts
│   │
│   ├── workers/           # Background Workers
│   │   ├── asset.worker.ts         # BullMQ worker for image processing
│   │   ├── normalize.worker.ts     # BullMQ worker for annotation normalization
│   │   └── deadline.worker.ts      # YENİ (BullMQ worker for SLA deadlines)
│   │
│   ├── routes/            # Express route tanımları
│   │   ├── index.ts       # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── admin.routes.ts
│   │   ├── dataset.routes.ts
│   │   ├── desktop-auth.routes.ts
│   │   ├── asset.routes.ts
│   │   ├── labelset.routes.ts
│   │   ├── listing.routes.ts
│   │   ├── contract.routes.ts
│   │   ├── proposal.routes.ts  # YENİ
│   │   ├── payment.routes.ts   # YENİ
│   │   ├── task.routes.ts
│   │   ├── annotation.routes.ts
│   │   └── review.routes.ts
│   │
│   ├── middlewares/       # Express middleware
│   │   ├── auth.middleware.ts        # JWT doğrulama
│   │   ├── role.middleware.ts        # Rol tabanlı erişim
│   │   ├── validate.middleware.ts    # Joi validation
│   │   ├── error.middleware.ts       # Global error handler
│   │   ├── cache.middleware.ts       # Redis cache
│   │   ├── upload.middleware.ts      # Multer file upload (MinIO/R2)
│   │   ├── rate-limit.middleware.ts  # Rate limiting
│   │   ├── security.middleware.ts    # Helmet & CORS
│   │   ├── csrf.middleware.ts        # CSRF koruması ve JSON guard
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
│   │   ├── export/        # Contract data export utilities (COCO, YOLO, VOC)
│   │   │   ├── export.types.ts
│   │   │   ├── export.helpers.ts
│   │   │   ├── coco.export.ts
│   │   │   ├── yolo.export.ts
│   │   │   └── voc.export.ts
│   │   ├── errors.ts      # Custom error classes
│   │   ├── auth.util.ts       # Auth ve session ömrü helper'ları (YENİ)
│   │   └── normalize.util.ts  # Normalize raw → normalized transform
│   └── index.ts           # App entry point
│
├── package.json
└── tsconfig.json
```

## 🏗️ Mimari

Proje **Service Layer Pattern** kullanılarak geliştirilmiştir:

- **Controllers:** Sadece HTTP istek/cevap döngüsünden ve validasyondan sorumludur.
- **Services:** Tüm iş mantığını (business logic) ve veritabanı etkileşimlerini barındırır.
- **Workers:** Uzun süren işlemleri arka planda asenkron olarak yürütür.
  - `asset-processing` ve `normalize-processing`: event-driven çalışır, iş geldiğinde tetiklenir.
  - `deadline-processing` ve `storage-cleanup`: repeatable job tabanlıdır; beta/demo ortamında Redis command tüketimini azaltmak için düşük frekanslı interval'larla çalışır. Deployment sonrası eski repeatable kayıtlar otomatik temizlenip yeni schedule uygulanır.
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

### Desktop Auth Routes (`/api/v1/desktop/auth`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/login` | Desktop login; JSON body içinde desktop bearer token döner, cookie set etmez |
| POST | `/logout` | Bearer auth ile korunur; server-side session revoke edilir ve lokal token'lar silinir |
| GET | `/profile` | Desktop bearer token ile profil doğrulama |

### Admin Routes (`/api/v1/admin`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/dashboard` | İstatistik paneli verileri (20+ metrik) |
| GET | `/users` | Tüm kullanıcıları listele (sayhalı, filtrelenebilir) |
| GET | `/users/:id` | Kullanıcı detayı (ilişki sayıları + son auditLog/proposal listesi) |
| PATCH | `/users/:id` | Kullanıcı rolünü vs. güncelle |
| DELETE | `/users/:id` | Kullanıcı sil |
| GET | `/monitoring/uploads` | Asset / upload pipeline metriklerini ve statülerini al |
| GET | `/monitoring/queues` | BullMQ kuyruk özetini ve son işleri al |
| GET | `/audit-logs` | Denetim loglarını listele (`?action`, `?entityType`, `?entityId`, `?actorSearch`, sayfalama) |
| GET | `/payments/dashboard` | Platform ödeme istatistikleri ve escrow özetleri (Faz 10) |
| GET | `/payments` | Ödeme kayıtlarını filtreli ve sayfalı olarak listele (Faz 10) |
| GET | `/invite-requests` | Beta davetiye taleplerini listele (sayfalı) |
| PATCH | `/invite-requests/:id/reject` | Bekleyen davetiye talebini reddet — audit log kaydeder |

#### Admin Panel Özellikleri

- Admin paneli; kullanıcı yönetimi, sistem metrikleri, upload takibi, kuyruk izleme, sözleşme/görev/review inceleme ve ödeme gözlemleme işlemlerini destekler.
- Contract, Task ve Review operasyonları için mevcut root endpoint'ler admin yetkisiyle yeniden kullanılır; gereksiz paralel route kopyaları oluşturulmaz.
- Annotation debug işlemleri `/api/v1/annotations` altında izole tutulur ve normal labeler submit pipeline'ının yerine geçmez. Bu admin debug route'ları (`GET /annotations/task/:id` dahil) `idParamSchema` ile UUID param doğrulamalarından (validation) geçirilmektedir.
- BigInt ve Decimal gibi Prisma'ya özel veri tiplerinin API response'a sızarak JSON serialization hatalarına yol açmasını engellemek için, upload monitoring ve task/review detail (QC view) API endpoint'lerinde bu değerler (`sizeBytes` vb.) güvenli bir şekilde string formatına dönüştürülerek döner.
- Queue Monitoring ekranında queue counts BullMQ'dan çekilir, recent jobs ise gerçek BullMQ state listelerine göre tag'lenir. Tamamlanan işler `removeOnComplete` nedeniyle listede sınırlı/boş olabilir. `recentJobs` listesi timestamp'e göre yeniden eskiye (descending) sıralanır.
- Retry Normalize özelliği jenerik bir "işlemi baştan başlat" operasyonu değildir; yalnızca `submitted` durumunda, geçerli raw annotation'ları bulunan ve mevcut submission'ı `processing` veya `completed` olmayan sözleşmeler için `pending`/`failed` işlemlerin yeniden denenmesi operasyonudur.
- Kritik admin mutasyonları `AuditLog` tablosuna kaydedilir.
- Audit log kayıtları filtreleme ve sayfalama desteğiyle listelenebilir.
- Kullanıcı detay endpoint'i ilişkili kayıt özetlerini, son proposal verilerini ve ilgili audit log kayıtlarını döner.
- Payment dashboard, ödeme kayıtlarını ve escrow durumlarını read-only olarak izlemeyi sağlar.
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
| GET | `/` | Assetleri listele (purged kayıtlar hariç tutulur) |
| GET | `/:id` | Asset detayı (purged asset için signedUrl: null) |
| POST | `/initiate` | Görsel yükleme başlat (presigned PUT URL dön) — quota transaction + row lock |
| POST | `/:id/confirm` | Yüklemeyi onayla ve işlemeye al — idempotent, concurrent-safe |
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

> **Mimari Not:** `acceptProposal` — sözleşme oluşturmanın tek kanonik yoludur. Transaction içinde: Proposal kabul → Contract oluştur (`pending_payment`) → Dataset asset'leri için Task'lar oluştur → Diğer başvuruları reddet → Listing status `payment_pending`'e güncelle. Ödeme tamamlandığında Contract `active`, Listing `in_progress` statüsüne geçer.

### Payment Routes (`/api/v1/payments`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/:contractId/intent` | Sözleşme için ödeme niyeti (intent) oluştur |
| POST | `/:contractId/confirm` | Mock ödemeyi onayla ve sözleşmeyi `active` yap |

> **Mimari Not:** Faz 4 ile sözleşmeler onaylandığında işleme başlayabilmek için ödemenin başarılı olması gerekir. Ödemesi tamamlanan sözleşmelerin statüsü `active`'e çekilir ve Labeler için çalışılabilir hale gelir.


### Contract Routes (`/api/v1/contracts`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Kullanıcının sözleşmeleri (role-based: client→clientUserId, labeler→labelerUserId) |
| GET | `/:id` | Sözleşme detayı |
| GET | `/:id/labeling-context` | Sözleşmeye ait etiketleme metadatasını (context) döner |
| GET | `/:id/export` | Onaylanmış sözleşmenin çıktılarını BBOX olarak indir (`?format=COCO/YOLO/VOC`) |
| GET | `/:id/qc-sample` | QC sample task seti al (client/admin, `?size=100`) |
| PATCH | `/:id/submit` | Sözleşmeyi teslim et (labeler) → normalize job enqueue |
| PATCH | `/:id/approve` | Sözleşmeyi onayla (client) — normalize completed gerektirir |
| PATCH | `/:id/reject` | Sözleşmeyi revision_requested'a çevir (client) — task statülerini sıfırlar |
| PATCH | `/:id/cancel` | Sözleşmeyi iptal et (client/admin). İhtilaflı (disputed) durumuna çekebilir. |
| POST | `/:id/rating` | Sözleşme için etiketleyiciyi (labeler) değerlendir (sadece müşteri) |
| POST | `/:id/normalize-retry` | Sadece `submitted` statüsündeki failed/pending normalize operasyonunu kontrollü olarak tekrar başlatır (admin only) |

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
| POST | `/release-expired` | Süresi dolan (expired) kilitleri temizler. Dönüş: `{ releasedCount, staleDeletedCount }` (admin) |

> **Snapshot Semantiği:** `POST /:id/submit` her çağrıda görevin **tamamen nihai annotation**'ını bekler (partial patch değil). Normalize worker her görev için en son geçerli raw kaydı kullanır.
> 
> **Lease Semantiği:** Görev kilit işlemleri (`POST /:id/lease` ve `POST /lease-batch`), süresi dolmuş (`leasedUntil <= now`) veya asılı kalmış (stale row) kilitleri otomatik olarak üzerine yazarak (reclaim) sisteme kazandırır. `POST /release-expired` yalnızca yardımcı bir admin opsiyonudur, normal işleyişte gerekli değildir. Bu temizlik operasyonunda, normal süresi dolmuş `leased` durumundaki görevler `ready` statüsüne döner; `submitted/accepted/rejected` gibi durumlardaki "stale lease" satırları ise görev statüsü korunarak izole şekilde silinir.
>
> **QC View Payload İşleme Notu:** `/:id/qc-view` endpointinden dönen verilerdeki annotation payload'ları frontend tarafında akıllıca parse edilir. Örn: `{ type: "export", data: [...] }` formatındaki envelope (zarf) tipli objeler frontend parser (`extractAnnotationShapes`) tarafından artık otomatik ayırt edilip içindeki array üzerinden işlenmektedir. Herhangi bir ekstra backend string manipulation'a gerek kalmadan JSON formatındaki raw/normalized annotation payload'unu olduğu gibi iletmeniz yeterlidir.


### Annotation Routes (`/api/v1/annotations`) 🔒 Admin Only

*(Faz 2 - Operasyonel Debug Modülü)*

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/raw` | Ham annotation kaydet (debug/reprocess — admin only, leaseToken yok) |
| POST | `/normalize` | Normalize annotation kaydet (debug — admin only, object veya array kabul eder) |
| GET | `/task/:id` | Göreve (task) ait raw ve normalized dataları okuma (debug amaçlı) |

> **İki Ayrı Annotation Akışı:**
> - **Kanonik labeler akışı:** `POST /tasks/:id/submit` — leaseToken ile raw kayıt oluşturur → normalize pipeline'a dahil edilir.
> - **Admin debug akışı:** `POST /annotations/raw` — leaseToken olmadan kayıt oluşturur → normalize worker bu kayıtları işlemeye **almaz** (`lease_token IS NOT NULL` kısıtlaması nedeniyle). Bu sınır, admin test/onarım işlemlerinin asıl etiketleme döngüsünü etkilememesini garanti eder.

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
- **Listing** - Etiketleme ilanları (open, payment_pending, in_progress, completed, cancelled) — Toplam fiyat modeli (`priceTotal`), `annotationFormat` enum (COCO/YOLO/VOC/Custom), `qcMode` (none, client_approval, internal_reviewer)
- **Proposal** - İlan başvuruları (pending, accepted, rejected, withdrawn) 
- **Contract** - İş sözleşmeleri (pending_payment, active, submitted, approved, revision_requested, disputed, cancelled) — `revisionReason`, `revisionRequestedAt`, `revisionCount` alanları ile revizyon takibi. Ödeme sonrası aktif olma mekanizması.
- **ContractRating** - Tamamlanan sözleşmelerin müşteri tarafından yapılan değerlendirme kayıtları (1-5 yıldız, `CHECK` kısıtlamalı, `AuditLog` destekli).
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
- **AuditLog** - Denetim logları; `actorUserId`, `action`, `entityType`, `entityId`, `metaJson` (JSON diff/özet), `createdAt` alanları. Tüm kritik admin mutasyonları bu tabloya yazılır (Faz 3).
- **Review** - QC review kayıtları (accept, reject)

## 🛡️ Middleware Pipeline

```text
Request 
  → Trust Proxy (if set) 
  → Security (Helmet/CORS) 
  → JSON-only Unsafe Request Guard
  → Body Parser (JSON) 
  → Cookie Parser 
  → Request Logger 
  → Rate Limiting 
  → CSRF Protection
  → API Routes (Web auth: JWT via httpOnly cookie; Desktop auth: Bearer token → Role Check → Validation → Controller) 
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
| PostgreSQL | 5433 | labelgun-postgres |
| Redis | 6379 | labelgun-redis |
| MinIO | 9000 (API) / 9001 (Console) | labelgun-minio |

### Desktop authentication sistemi (`Authorization: Bearer`):

1. **Desktop Login** -> `POST /api/v1/desktop/auth/login` JSON içinde `clientType: "desktop"` ve `tokenUse: "access"` claim'li kisa ömürlü (15m) bearer token, uzun ömürlü (30d) opaque refresh token ve bir `sessionId` döner. Cookie set etmez.
2. **Desktop API Çağrıları** -> Electron main process `Authorization: Bearer <accessToken>` header'ını ekler; renderer token'lara erişemez.
3. **Refresh Rotation** -> Süresi dolan access token'lar, arka planda `POST /api/v1/desktop/auth/refresh` çağrısı ile yenilenir. Her yenilemede `refreshToken` güncellenir ve veritabanında `DesktopSession` tablosu üzerinde versiyon artırılır. Eski veya tekrar kullanılan bir refresh token yakalanırsa güvenlik gereği oturum iptal edilir (revoked).
4. **CSRF Sınırı** -> Bearer token cookie gibi ambient credential olmadığı için desktop bearer istekleri CSRF kontrolüne tabi değildir. Web cookie isteklerinde CSRF zorunlu kalır. `/refresh` endpointi cookie göndermediği sürece CSRF denetimini by-pass eder.
5. **Logout & Session Revocation** -> `POST /api/v1/desktop/auth/logout` çağrısı veritabanındaki `DesktopSession` kaydını anında `revokedAt` ile işaretler ve oturumu kalıcı olarak sunucu tarafında geçersiz kılar. Lokal token'lar da temizlenir.

## 🔧 Environment Variables

`.env.example` dosyasını `.env` olarak kopyala:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/labelgun

# Redis
REDIS_URL=redis://localhost:6379

# JWT & Security
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
DESKTOP_ACCESS_TOKEN_EXPIRES_IN=15m
DESKTOP_REFRESH_TOKEN_EXPIRES_IN=30d
DESKTOP_REFRESH_TOKEN_SECRET=your-refresh-token-secret-for-desktop
CSRF_SECRET=optional-secret-key
COOKIE_SAMESITE=lax

# MinIO / S3-Compatible Storage (replaces Cloudflare R2 in development)
R2_ACCOUNT_ID="minio-local"
R2_ACCESS_KEY_ID="minioadmin"
R2_SECRET_ACCESS_KEY="minioadmin"
R2_BUCKET_NAME="labelgun-assets"
MINIO_ENDPOINT="http://localhost:9000"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"

# Storage CORS — Production'da frontend domain'i yaz:
# STORAGE_ALLOWED_ORIGINS="https://your-frontend-domain.com"
STORAGE_ALLOWED_ORIGINS="http://localhost:5173"

# BullMQ Repeatable Job Interval'ları (ms)
# Beta/demo ortamında Redis command tüketimini azaltmak için yüksek tutulabilir.
# Env yoksa queue.ts içindeki default değerler kullanılır (12h / 24h).
DEADLINE_SCAN_INTERVAL_MS=43200000
STORAGE_CLEANUP_SCAN_INTERVAL_MS=86400000

# Logging
# Boş deadline scan loglarını kapatmak için false önerilir.
LOG_DEADLINE_SCANS=false
```

## 🔐 Authentication

Web authentication sistemi (`httpOnly` cookie + CSRF):

1. **Register/Login** → Sunucu JWT'yi `httpOnly`, `secure`, `SameSite` cookie olarak set eder
2. **Her istekte** → Tarayıcı cookie'yi otomatik gönderir (frontend `withCredentials: true`)
3. **Unsafe İstekler** (POST/PUT vb.) → `GET /api/v1/auth/csrf` üzerinden alınan CSRF token, `X-CSRF-Token` header'ı ile gönderilir. Sunucu bu token'ı imzalı ve `httpOnly` olan `csrf_token` cookie'si ile doğrular.
4. **Logout** → `POST /api/v1/auth/logout` hem auth hem de csrf cookie'lerini temizler.
5. **Token expire** → Yeniden login gerekli

> **Not:** JWT ve CSRF token response body'de dönülüp `localStorage`'da tutulmaz — XSS saldırılarına karşı güvenli.

Desktop authentication sistemi (`Authorization: Bearer`):

1. **Desktop Login** → `POST /api/v1/desktop/auth/login` JSON içinde kısa ömürlü access token, opaque refresh token ve `sessionId` döner; cookie set etmez.
2. **Desktop API çağrıları** → Electron main process `Authorization: Bearer <accessToken>` header'ını ekler; renderer token'a erişmez.
3. **Refresh rotation** → `POST /api/v1/desktop/auth/refresh` refresh token'ı döndürür; backend yalnızca HMAC-SHA256 hash saklar ve `DesktopSession` üzerinden revocation/expiry kontrolü yapar.
4. **CSRF sınırı** → Bearer token cookie gibi ambient credential olmadığı için desktop bearer istekleri CSRF kontrolüne tabi değildir. Web cookie isteklerinde CSRF zorunlu kalır.
5. **Logout** → `POST /api/v1/desktop/auth/logout` bearer auth ile korunur; server-side olarak `revokedAt` set edilerek oturum geçersiz kılınır ve lokal token'lar temizlenir.

### 🛡️ Security Hardening

**CORS & Startup Validation**
- Production `ALLOWED_ORIGINS` must be real HTTPS frontend origins. Localhost and wildcard origins are rejected at startup.
- Critical environment variables (`JWT_SECRET`, `DESKTOP_REFRESH_TOKEN_SECRET`, `ALLOWED_ORIGINS`, `COOKIE_SAMESITE`, and R2 storage credentials) are validated on startup; the server refuses to start if any are missing or insecure in production.
- `CSRF_SECRET` is optional but recommended in production for stronger CSRF token signing.

**Operational Logging**
- Prisma SQL query logging is opt-in via `PRISMA_QUERY_LOG=true`. Keep it disabled in production and enable it only temporarily while debugging.
- Empty deadline scans are quiet by default. Set `LOG_DEADLINE_SCANS=true` only when investigating the deadline worker.

**Upload Pipeline**
- Allowed MIME types are strictly `image/jpeg`, `image/png`, and `image/webp`. SVG, GIF, AVIF, `text/html`, and all other types are rejected at the Joi schema layer before any service logic runs.
- Object keys use MIME-derived safe extensions (e.g. `.jpg`, `.png`, `.webp`); the original filename extension is never trusted.
- On `POST /assets/:id/confirm`, a `HeadObject` call verifies the actual uploaded object's `Content-Type` and `Content-Length` against the database record before the asset is confirmed. Invalid objects are deleted from storage and marked `storageState: purged` so they do not consume quota.
- The asset worker downloads the object and runs `sharp(buffer).metadata()` to verify the real image format. Files whose detected format does not match the declared MIME type, or whose format is not in the allowed list, are rejected and purged before being marked `ready`.

**Storage CORS**
- Direct-upload CORS is applied to the bucket with explicit origin allowlist, `AllowedMethods: [PUT, GET, HEAD]`, and `AllowedHeaders: [Content-Type, x-amz-*]`.
- In production, non-HTTPS and localhost origins are silently dropped; the server throws if no valid origins remain.

## 📊 Rol Tabanlı Erişim

| Rol | Erişim Hakları |
|-----|----------------|
| **admin** | Tüm endpointlere erişim, kullanıcı yönetimi, normalize retry, debug annotation |
| **client** | Dataset, listing yönetimi, proposal kabul/red, contract QC (approve/reject). Proposal oluşturamaz (403). Sadece kendi `clientUserId` ile eşleşen sözleşmeleri görür. |
| **labeler** | İlanları görüntüleme, proposal oluşturma, görev lease/submit. Sadece kendi `labelerUserId` ile eşleşen sözleşmeleri görür. |

## ⚡ Redis Cache Stratejisi

Backend, Redis'i kısa süreli GET response caching için kullanmaktadır. Sadece güvenli ve nispeten stabil endpoint grupları cache kapsamına alınmaktadır.

### 1. Cache Key Formatı

Cache key yapısı **user-aware** (kullanıcıya duyarlı) ve **role-aware** (role duyarlı) olarak tasarlanmıştır:

- **Authenticated:** `cache:u:<userId>:r:<role>:/api/v1/<resource>?<canonical-query>`
- **Anonymous:** `cache:anon:/api/v1/<resource>?<canonical-query>`

- **`userId` segmenti:** Cross-user cache sızıntısı (leak) riskini azaltır.
- **`role` segmenti:** Kullanıcının rolü değiştiğinde eski role ait yetkisiz cached response dönmesini engeller.
- **`canonical-query`:** Query parametreleri alfabetik sıralanarak canonical (standart) hale getirilir, böylece farklı sırayla gelen aynı parametreler aynı cache key'i üretir.

### 2. Cache Kapsamındaki Endpoint Grupları
- `listings`
- `datasets`
- `labelsets`

### 3. Cache Dışında Bırakılan Endpoint Grupları
Aşağıdaki endpointler dinamik yapıları veya içerdikleri veriler sebebiyle bilerek cache dışında tutulmuştur:
- **`assets`:** Response içinde `signedUrl` üretildiği için cache edilmez.
- **`contracts`:** Kullanıcıya özeldir ve lifecycle durumu sık değişir.
- **`proposals`:** Operasyonel olarak hassas ve dinamiktir.
- **`payments`:** Finansal veri içerir.
- **`tasks`:** Lease (kilit) durumu çok dinamiktir.
- **`reviews`:** QC durumu sürekli değişir.
- **`admin` endpoints:** Audit, monitoring ve yönetim verileri içerdiği için anlık olmalıdır.

### 4. Cache Invalidation Stratejisi
- Cache invalidation route'larda değil, **service katmanında** yapılır.
- Merkezi bir helper kullanılır: `invalidateApiCache('/api/v1/<resource>')`
- Bu helper; user-aware, role-aware, anonymous, paginated ve filtered tüm varyantları wildcard pattern ile temizler.
- Redis üzerinde production ortamını bloklamamak (single-threaded timeout) için `KEYS` yerine **`SCAN` tabanlı pattern deletion** kullanılır.

### 5. Signed URL Güvenliği
- Asset endpoint'leri cache edilmez çünkü asset response'larında S3/R2 signed URL bulunabilir.
- Signed URL'ler güvenlik gereği **her request'te yeniden üretilmelidir**.
- Bu sayede rol değişimi, asset silinmesi, sözleşme iptali veya storage purge işlemlerinden sonra "stale" (eski) URL dönme riski ortadan kaldırılır.

### 6. Storage Lifecycle İlişkisi
- Dataset'in `storageState`'i (örneğin purged veya purge_scheduled) değiştiğinde dataset cache'i invalidate edilir.
- `purge_scheduled`, `purging`, `purged` veya `purge_failed` gibi durumların frontend'e stale gitmesi engellenir.
- DB state değiştikten sonra R2, S3 veya BullMQ gibi dış servislerde hata oluşsa bile, kritik yerlerde `try/finally` blokları kullanılarak cache invalidation'ın mutlaka çalışması garanti altına alınmıştır.

### 7. Assets Cache Invalidation
- `assets` endpointleri `cacheMiddleware` kapsamında değildir (signed URL güvenliği).
- Bu nedenle `invalidateApiCache('/api/v1/assets')` çağrısı hiçbir yerde bulunmaz; böyle bir çağrı yalnızca gereksiz Redis `SCAN/DEL` komutu üretir.
- Dataset cache invalidation, asset upload/confirm/worker finalization sonrasında korunur: asset sayısı veya dataset statüsü değiştiğinde dataset list/detail response'ları stale olabileceğinden `invalidateApiCache('/api/v1/datasets')` çağrıları ilgili servis ve worker katmanlarında bulunmaya devam eder.
- `initiateUpload` yalnızca pending pre-upload kaydı oluşturduğu için bu aşamada dataset cache invalidation yapılmaz; asıl invalidation `completeUpload` ve worker finalization aşamalarında gerçekleşir.
