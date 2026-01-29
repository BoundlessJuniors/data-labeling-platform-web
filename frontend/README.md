# Data Labeling Platform - Frontend

Vue 3 + Tailwind CSS ile oluşturulmuş kullanıcı arayüzü.

## 🛠️ Tech Stack

- **Framework:** Vue 3 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v3
- **State Management:** Pinia
- **Routing:** Vue Router 4
- **HTTP Client:** Axios

## 📋 Gereksinimler

- Node.js 18+
- npm

## 🚀 Kurulum

```bash
npm install
npm run dev
```

UI: `http://localhost:5173`

## 📁 Proje Yapısı

```
src/
├── api/              # Axios client & API functions
├── stores/           # Pinia stores
├── router/           # Vue Router
├── views/            # Page components
│   ├── HomePage.vue
│   ├── LoginPage.vue
│   ├── RegisterPage.vue
│   ├── admin/        # Admin pages
│   ├── client/       # Client pages
│   └── labeler/      # Labeler pages
├── layouts/          # Layout components
├── App.vue
├── main.ts
└── style.css         # Tailwind + custom styles
```

## 🔐 Sayfa Yapısı

| Sayfa | Rol | Açıklama |
|-------|-----|----------|
| `/` | Herkese açık | Ana sayfa |
| `/login` | Herkese açık | Giriş |
| `/register` | Herkese açık | Kayıt |
| `/admin/users` | Admin | Kullanıcı yönetimi |
| `/client/datasets` | Client | Dataset yönetimi |
| `/client/listings` | Client | İlan yönetimi |
| `/client/contracts` | Client | Sözleşme yönetimi |
| `/labeler/listings` | Labeler | İş bul |
| `/labeler/contracts` | Labeler | Sözleşmelerim |
| `/labeler/tasks` | Labeler | Görevlerim |

## 📜 Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
