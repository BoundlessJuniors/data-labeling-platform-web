# Data Labeling Platform - Backend API

Görsel veri etiketleme platformu için RESTful API.

## 🛠️ Tech Stack

| Kategori | Teknoloji |
|----------|-----------|
| **Runtime** | Node.js + TypeScript |
| **Framework** | Express.js |
| **ORM** | Prisma |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Auth** | JWT + bcrypt |

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
src/
├── controllers/     # API endpoint handlers
├── routes/          # Express route definitions
├── middlewares/     # Express middlewares
├── validators/      # Joi validation schemas
├── lib/             # Prisma, Redis, Logger
├── utils/           # Custom error classes
└── index.ts         # App entry point
```

## 🔌 API Endpoints Özeti

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

## 🗄️ Veritabanı

15 tablo: `users`, `datasets`, `assets`, `label_sets`, `labels`, `listings`, `contracts`, `tasks`, `task_leases`, `annotations_raw`, `annotations_normalized`, `payments`, `escrow_ledger`, `audit_logs`, `reviews`

## 📜 Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Development server |
| `npm run build` | TypeScript build |
| `npx prisma studio` | Prisma Studio |
| `npx prisma migrate dev` | Migration çalıştır |

## 🐳 Docker Servisleri

```bash
# Root klasörde çalıştır
docker-compose up -d
```

- **PostgreSQL:** `localhost:5433`
- **Redis:** `localhost:6379`

Detaylı API dokümantasyonu için tüm endpoint'lerin listesi backend kodunda mevcuttur.
