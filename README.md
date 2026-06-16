# 🏆 Web Cabor — Sistem Manajemen Turnamen Olahraga

Aplikasi web untuk mengelola turnamen olahraga (Cabang Olahraga) antar grup/ronda, mencakup jadwal pertandingan, hasil, klasemen, dan administrasi data.

---

## 🛠️ Tech Stack & Tools

| Kategori | Tool / Library | Versi | Kegunaan |
|---|---|---|---|
| **Framework** | [Next.js](https://nextjs.org) | 16.x | Full-stack React framework (App Router) |
| **UI Library** | [React](https://react.dev) | 19.x | Komponen antarmuka |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) | v4 | Utility-first CSS framework |
| **Database** | [Turso / libSQL](https://turso.tech) | 0.14.x | SQLite di cloud (serverless-ready) via `@libsql/client` |
| **Autentikasi** | [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | 9.x | JWT untuk session admin |
| **Enkripsi** | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 3.x | Hash password admin |
| **Ikon** | [lucide-react](https://lucide.dev) | 1.x | Ikon SVG siap pakai |
| **Export PDF** | [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) | 4.x / 5.x | Generate laporan PDF |
| **Export Excel** | [xlsx](https://sheetjs.com) | 0.18.x | Generate file Excel (.xlsx) |
| **Runtime** | [Node.js](https://nodejs.org) | ≥ 18.x | JavaScript runtime |
| **Package Manager** | npm | bawaan Node.js | Manajemen dependensi |

---

## 📁 Struktur Proyek

```
web-cabor/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.js             # Halaman publik utama (jadwal, klasemen)
│   │   ├── layout.js           # Root layout & font
│   │   ├── globals.css         # Global styles + Tailwind
│   │   ├── admin/              # Halaman dashboard admin (protected)
│   │   └── api/                # API Routes (REST)
│   │       ├── auth/           # Login / logout
│   │       ├── sports/         # CRUD cabang olahraga
│   │       ├── groups/         # CRUD grup / ronda
│   │       ├── players/        # CRUD pemain
│   │       ├── matches/        # CRUD pertandingan & hasil
│   │       ├── dashboard/      # Statistik ringkasan
│   │       └── admin/          # Manajemen akun admin
│   └── lib/
│       ├── db.js               # Koneksi & inisialisasi database SQLite
│       ├── auth.js             # Helper JWT & bcrypt
│       └── seed.mjs            # Script seed data awal
├── tournament.db               # File database SQLite lokal (jika tidak pakai Turso cloud)
├── .env.local                  # Variabel environment (JWT & Turso URL)
├── next.config.mjs
├── package.json
└── postcss.config.mjs
```

---

## ⚙️ Setup dari Awal

### 1. Prasyarat

Pastikan sudah terinstall:

- **Node.js** versi **18 atau lebih baru**
  ```bash
  node -v   # Harus >= v18.0.0
  ```
- **npm** (sudah termasuk dalam Node.js)
  ```bash
  npm -v
  ```

> Belum punya Node.js? Download di [nodejs.org](https://nodejs.org) dan pilih versi **LTS**.

---

### 2. Clone / Download Proyek

```bash
# Jika menggunakan Git
git clone <url-repo-ini>
cd web-cabor
```

Atau ekstrak file ZIP-nya lalu masuk ke folder proyek.

---

### 3. Install Dependensi

```bash
npm install
```

Perintah ini akan mengunduh semua package yang tertera di `package.json` ke dalam folder `node_modules/`.

---

### 4. Buat File Environment

Buat file `.env.local` di root proyek:

```bash
# Windows (PowerShell)
New-Item .env.local

# atau buat manual lewat teks editor
```

Isi file `.env.local` dengan:

```env
JWT_SECRET=ganti_dengan_string_acak_yang_panjang_dan_aman
TURSO_DATABASE_URL=libsql://nama-db-username.turso.io
TURSO_AUTH_TOKEN=xxxxxxxxxxxxxxx
```

> ⚠️ **Penting:** Ganti nilai `JWT_SECRET` dengan string acak yang kuat (minimal 32 karakter).
> Untuk menggunakan **Turso**, daftar di [turso.tech](https://turso.tech), buat database, dan masukkan URL beserta Token-nya. Jika dikosongkan, aplikasi akan menggunakan file lokal `tournament.db`.

---

### 5. Seed Database (Isi Data Awal)

Jalankan script seed untuk membuat tabel dan mengisi data contoh:

```bash
npm run seed
```

Script ini akan:
- Membuat tabel dan menyambung ke **Turso cloud** (atau membuat `tournament.db` lokal)
- Membuat semua tabel (`admins`, `sports`, `groups`, `players`, `matches`)
- Mengisi data awal: **5 cabang olahraga**, **10 grup ronda** (Pool A & B), **pemain**, dan **sample pertandingan**
- Membuat akun admin default

Output yang diharapkan:
```
✅ Database seeded successfully!
   📁 Target URL: ...

   👤 Admin: admin / admin123
   🏐 4 cabang olahraga
   👥 10 grup ronda (Pool A & Pool B)
   📅 Sample matches seeded with details
```

---

### 6. Jalankan Development Server

```bash
npm run dev
```

Buka browser dan akses:

- **Halaman Publik:** [http://localhost:3000](http://localhost:3000)
- **Dashboard Admin:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

### 7. Login Admin

Gunakan kredensial default hasil seed:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

> ⚠️ **Segera ganti password** setelah login pertama melalui menu pengaturan admin.

---

## 📜 Scripts yang Tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server development (hot-reload) |
| `npm run build` | Build aplikasi untuk production |
| `npm run start` | Menjalankan hasil build production |
| `npm run seed` | Reset & isi ulang database dengan data awal |

---

## 🗃️ Database

Aplikasi kini menggunakan **Turso** via `@libsql/client` yang 100% kompatibel dengan serverless seperti Vercel. Anda masih bisa menggunakan database SQLite lokal saat development jika `TURSO_DATABASE_URL` tidak diset.

**Skema tabel:**

```
admins   → Akun admin (username, password_hash)
sports   → Cabang olahraga (Sepak Bola, Bulutangkis, dll)
groups   → Grup / ronda peserta (Pool A / Pool B)
players  → Pemain (terhubung ke grup & cabang olahraga)
matches  → Pertandingan (jadwal, skor, stage, status, detail)
```

---

## 🚀 Build untuk Production

```bash
# 1. Build
npm run build

# 2. Jalankan
npm run start
```

Akses di [http://localhost:3000](http://localhost:3000).

> ☁️ **Deploy ke Vercel:** Proyek ini sudah 100% siap di-deploy ke Vercel karena menggunakan database cloud Turso. Pastikan Anda telah memasukkan `JWT_SECRET`, `TURSO_DATABASE_URL`, dan `TURSO_AUTH_TOKEN` ke menu Environment Variables di dashboard Vercel Anda.
