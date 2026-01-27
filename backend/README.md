# Data Labeling Platform - Backend

## Gereksinimler

- Node.js 18+ 
- Docker & Docker Compose
- npm veya yarn

## Kurulum

### 1. Bağımlılıkları Yükle

```bash
cd backend
npm install
```

### 2. Docker PostgreSQL'i Başlat

Proje root dizininde:

```bash
docker-compose up -d
```

PostgreSQL şu ayarlarla başlayacak:
- **Host:** localhost
- **Port:** 5432
- **User:** postgres
- **Password:** postgres
- **Database:** datalabeling

### 3. Migration Çalıştır

```bash
cd backend
npx prisma migrate dev --name init
```

### 4. Seed Data (Opsiyonel)

```bash
npx prisma db seed
```

Bu komut şunları oluşturur:
- 1 Admin user (`admin@datalabeling.com`)
- 1 Client user (`client@example.com`)
- 1 Labeler user (`labeler@example.com`)
- 1 Label Set ("Object Detection - Vehicles & Pedestrians")
- 3 Label (person, car, truck)

### 5. Prisma Studio (Görsel DB Yönetimi)

```bash
npx prisma studio
```

Tarayıcıda `http://localhost:5555` adresinde açılır.

## Veritabanı Şeması

15 tablo içerir:

| Tablo | Amaç |
|-------|------|
| `users` | Müşteri, etiketleyici veya admin |
| `datasets` | Müşterinin dataset metadata'sı |
| `assets` | Dataset içindeki tek görsel |
| `label_sets` | Etiket sınıfları seti (versiyonlanabilir) |
| `labels` | LabelSet içindeki tek label |
| `listings` | Etiketleme ilanı |
| `contracts` | Labeler ilanı aldığında oluşan sözleşme |
| `tasks` | 1 task = 1 asset, en küçük iş birimi |
| `task_leases` | Task'ı süreli kilitleme |
| `annotations_raw` | Desktop'un gönderdiği ham JSON |
| `annotations_normalized` | Normalize edilmiş annotation (COCO/YOLO export için) |
| `payments` | Ödeme kaydı |
| `escrow_ledger` | Para hareketleri muhasebesi |
| `audit_logs` | Denetim log'u |
| `reviews` | QC review kaydı |

## Ortam Değişkenleri

`.env` dosyası:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/datalabeling?schema=public"
```

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Development server başlat |
| `npm run prisma:generate` | Prisma Client oluştur |
| `npm run prisma:migrate` | Migration çalıştır |
| `npm run prisma:studio` | Prisma Studio aç |
| `npm run db:seed` | Seed data ekle |
