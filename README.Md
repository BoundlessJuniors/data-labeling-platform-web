# Data Labeling Platform

Görsel veri etiketleme işlerini yöneten bir pazar yeri platformu.

## 🏗️ Proje Yapısı

```
data-labeling-platform-web/
├── backend/              # Node.js + Express + Prisma API
├── frontend/             # Vue 3 + Tailwind CSS web app
├── docker-compose.yml    # PostgreSQL + Redis
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
| **Frontend** | Vue 3, Tailwind CSS, Pinia, TypeScript |
| **Backend** | Node.js, Express, TypeScript |
| **ORM** | Prisma |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Auth** | JWT |

## 🐳 Docker Servisleri

| Servis | Port | Container |
|--------|------|-----------|
| PostgreSQL | 5433 | data-labeling-postgres |
| Redis | 6379 | data-labeling-redis |

## 📖 Detaylı Dokümantasyon

| Proje | Dokümantasyon |
|-------|---------------|
| **Frontend** | [frontend/README.md](./frontend/README.md) - Kapsamlı geliştirme rehberi |
| **Backend** | [backend/README.md](./backend/README.md) - API özeti |

## 👥 Takım

BoundlessJuniors
