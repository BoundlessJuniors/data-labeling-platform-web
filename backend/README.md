# Data Labeling Platform - Backend API

RESTful API for the Data Labeling Marketplace Platform.

## 🛠️ Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Cache:** Redis
- **Auth:** JWT + bcrypt

## 📋 Gereksinimler

- Node.js 18+
- Docker & Docker Compose
- npm

## 🚀 Kurulum

### 1. Bağımlılıkları Yükle

```bash
cd backend
npm install
```

### 2. Environment Variables

`.env.example` dosyasını `.env` olarak kopyala:

```bash
cp .env.example .env
```

### 3. Docker Servislerini Başlat

```bash
docker-compose up -d
```

Bu komut şunları başlatır:
- **PostgreSQL:** `localhost:5433`
- **Redis:** `localhost:6379`

### 4. Prisma Setup

```bash
# Client oluştur
npx prisma generate

# Migration çalıştır (ilk kurulumda)
npx prisma migrate dev

# Seed data ekle (opsiyonel)
npx prisma db seed
```

### 5. Sunucuyu Başlat

```bash
npm run dev
```

API: `http://localhost:3000`

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/api/auth/register` | ❌ | Kullanıcı kaydı |
| POST | `/api/auth/login` | ❌ | JWT token al |
| GET | `/api/auth/profile` | ✅ | Profil bilgisi |

### Datasets
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/datasets` | 🔶 | Tüm datasetleri listele |
| POST | `/api/datasets` | ✅ | Yeni dataset oluştur |
| GET | `/api/datasets/:id` | 🔶 | Dataset detayı |
| PUT | `/api/datasets/:id` | ✅ | Dataset güncelle |
| DELETE | `/api/datasets/:id` | ✅ | Dataset sil |

### Assets
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/assets` | ✅ | Varlıkları listele |
| POST | `/api/assets` | ✅ | Yeni varlık ekle |
| GET | `/api/assets/:id` | ✅ | Varlık detayı |
| PUT | `/api/assets/:id` | ✅ | Varlık güncelle |
| DELETE | `/api/assets/:id` | ✅ | Varlık sil |

### LabelSets
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/labelsets` | ✅ | Etiket setlerini listele |
| POST | `/api/labelsets` | ✅ | Etiket seti oluştur |
| GET | `/api/labelsets/:id` | ✅ | Etiket seti detayı |
| DELETE | `/api/labelsets/:id` | ✅ | Etiket seti sil |

### Listings
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/listings` | 🔶 | İlanları listele |
| POST | `/api/listings` | ✅ | Yeni ilan oluştur |
| GET | `/api/listings/:id` | 🔶 | İlan detayı |
| PUT | `/api/listings/:id` | ✅ | İlan güncelle |
| DELETE | `/api/listings/:id` | ✅ | İlan sil |

> ✅ = JWT gerekli | 🔶 = Opsiyonel auth | ❌ = Public

## 🗄️ Veritabanı Şeması

15 tablo içerir:

| Tablo | Amaç |
|-------|------|
| `users` | Kullanıcılar (client, labeler, admin) |
| `datasets` | Dataset metadata |
| `assets` | Dataset içindeki görseller |
| `label_sets` | Etiket sınıfları seti |
| `labels` | Tekil etiketler |
| `listings` | Etiketleme ilanları |
| `contracts` | Labeler-Client sözleşmeleri |
| `tasks` | En küçük iş birimi (1 task = 1 asset) |
| `task_leases` | Task kilitleme |
| `annotations_raw` | Ham annotation JSON |
| `annotations_normalized` | Normalize annotation |
| `payments` | Ödeme kayıtları |
| `escrow_ledger` | Para hareketleri |
| `audit_logs` | Denetim logları |
| `reviews` | QC review kayıtları |

## 🛡️ Middleware Stack

| Middleware | Açıklama |
|------------|----------|
| **Helmet** | HTTP security headers |
| **CORS** | Cross-origin resource sharing |
| **Rate Limiting** | 100 req/min (auth: 10 req/min) |
| **JWT Auth** | Token doğrulama |
| **RBAC** | Role-based access control |
| **Joi Validation** | Request body/params doğrulama |
| **Redis Cache** | GET istekleri cache'leme |
| **Winston Logger** | Request/response logging |
| **Error Handler** | Merkezi hata yönetimi |

## 📁 Proje Yapısı

```
src/
├── controllers/     # API endpoint handlers
├── routes/          # Express route definitions
├── middlewares/     # Express middlewares
├── validators/      # Joi validation schemas
├── lib/             # Prisma, Redis, Logger
├── utils/           # Custom error classes
└── index.ts         # App entry point
```

## 🧪 Test

```bash
# Health check
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","role":"client"}'
```

## 📜 Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Development server |
| `npm run build` | TypeScript build |
| `npm run prisma:generate` | Prisma Client oluştur |
| `npm run prisma:migrate` | Migration çalıştır |
| `npm run prisma:studio` | Prisma Studio aç |
| `npm run db:seed` | Seed data ekle |
