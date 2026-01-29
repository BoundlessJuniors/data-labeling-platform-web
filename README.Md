# Data Labeling Platform

Görsel veri etiketleme işlerini yöneten bir pazar yeri platformu.

## 🏗️ Proje Yapısı

```
data-labeling-platform-web/
├── backend/          # Node.js + Express + Prisma API
├── frontend/         # Vue 3 + Tailwind CSS web app
└── README.md
```

## 🚀 Hızlı Başlangıç

### 1. Backend

```bash
cd backend
npm install
docker-compose up -d    # PostgreSQL + Redis
npx prisma generate
npx prisma migrate dev
npm run dev
```

API: `http://localhost:3000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: `http://localhost:5173`

## 📚 Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Node.js, Express, TypeScript |
| **Frontend** | Vue 3, Tailwind CSS, Pinia |
| **ORM** | Prisma |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Auth** | JWT |

## 🔗 Linkler

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## 👥 Takım

BoundlessJuniors
