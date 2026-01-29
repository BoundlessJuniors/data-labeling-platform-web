# Data Labeling Platform

Görsel veri etiketleme işlerini yöneten bir pazar yeri platformu.

## 🏗️ Proje Yapısı

```
data-labeling-platform-web/
├── backend/          # Node.js + Express + Prisma API
├── frontend/         # (Coming soon) React/Next.js web app
└── README.md
```

## 🚀 Hızlı Başlangıç

### Backend

```bash
cd backend
npm install
docker-compose up -d
npx prisma generate
npm run dev
```

API: `http://localhost:3000`

Detaylı kurulum için: [Backend README](./backend/README.md)

## 📚 Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Node.js, Express, TypeScript |
| **ORM** | Prisma |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Auth** | JWT |

## 👥 Takım

BoundlessJuniors
