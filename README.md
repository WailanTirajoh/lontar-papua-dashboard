# Dashboard Lontar Papua

Dashboard admin untuk pesanan yang masuk lewat situs pembeli
([lontar-papua](https://github.com/WailanTirajoh/lontar-papua)). Dibangun
dengan Nuxt 4, Tailwind CSS v4, dan [@nuxtjs/supabase](https://supabase.nuxtjs.org)
untuk login.

## Satu database, dua aplikasi

Dashboard ini **tidak punya database sendiri**. Ia menunjuk ke proyek Supabase
yang sama dengan situs pembeli dan membaca dua tabel yang sudah ada di sana:

| Tabel | Ditulis oleh | Dibaca di sini |
| --- | --- | --- |
| `orders` | `server/api/orders.post.ts` di repo situs pembeli | daftar pesanan |
| `order_items` | idem | rincian varian per pesanan |

Bentuk kolomnya ada di `supabase/migrations/20260919092758_create_orders_and_order_items.sql`
pada repo situs pembeli, dan disalin sebagai tipe TypeScript di
`shared/types/order.ts`. **Migrasi tinggal di repo situs pembeli**; bila skema
berubah di sana, berkas tipe di sini yang menyesuaikan - jangan membuat migrasi
tandingan di repo ini, karena dua repo yang sama-sama memigrasikan satu
database adalah cara tercepat membuat keduanya saling menimpa.

Satu-satunya tulisan yang dilakukan dashboard adalah kolom `status` pada
`orders` (`baru` → `diproses` → `selesai`, atau `batal`).

### Kenapa datanya dibaca lewat `server/api`, bukan langsung dari browser

Migrasi di situs pembeli menyalakan RLS pada kedua tabel **tanpa satu pun
policy**, lalu mencabut grant `anon` dan `authenticated`. Artinya publishable
key yang ikut ke browser memang tidak bisa membaca apa pun - disengaja, supaya
data pembeli tidak pernah terjangkau dari sisi klien.

Karena itu dashboard membaca lewat rute Nitro (`server/api/*`) memakai secret
key, dan pemeriksaan "siapa yang boleh membaca" terjadi di
`server/utils/admin.ts`, bukan di database. Konsekuensinya satu aturan keras:
**tidak ada handler yang boleh memanggil `serverSupabaseServiceRole()` sebelum
`requireAdmin()` lolos.**

`requireAdmin()` gagal tertutup - selama `NUXT_ADMIN_EMAILS` kosong, semua
permintaan ditolak. Ini bukan kehati-hatian berlebihan: Supabase Auth menerima
pendaftaran siapa pun selama provider email dibiarkan terbuka, jadi "sudah
punya sesi" bukan izin.

## Menjalankan

```bash
pnpm install
cp .env.example .env   # lalu isi keempat nilainya
pnpm dev               # http://localhost:3000
```

Perintah lain:

```bash
pnpm build        # build produksi
pnpm lint         # ESLint
```

## Konfigurasi

Seluruhnya lewat environment variables; tidak ada satu pun kunci di dalam
kode. Rinciannya ada di `.env.example`:

| Variabel | Isi |
| --- | --- |
| `NUXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase, sama dengan situs pembeli |
| `NUXT_PUBLIC_SUPABASE_KEY` | publishable key (dulu anon key) - dipakai untuk login |
| `NUXT_SUPABASE_SECRET_KEY` | secret key / `service_role` - hanya dipakai di server |
| `NUXT_ADMIN_EMAILS` | daftar email admin, dipisah koma |

> Dua nama pertama adalah nama yang dibaca `@nuxtjs/supabase` v2 secara
> bawaan. Di repo situs pembeli, kunci yang sama bernama `NUXT_SUPABASE_URL`
> dan `NUXT_SUPABASE_SERVICE_ROLE_KEY` - nilainya sama, hanya nama
> variabelnya yang berbeda karena di sana tidak memakai modul ini.

## Membuat akun admin

Supabase Auth di proyek ini tidak punya halaman daftar, dan memang tidak
seharusnya punya. Akun dibuat manual:

1. Supabase Dashboard > **Authentication** > **Users** > **Add user** >
   *Create new user*.
2. Isi email dan kata sandi, centang *Auto Confirm User* supaya akunnya
   langsung bisa dipakai tanpa email verifikasi.
3. Tambahkan email itu ke `NUXT_ADMIN_EMAILS`, lalu jalankan ulang aplikasi
   (environment variable baru tidak terbaca tanpa restart).

Sangat disarankan mematikan pendaftaran terbuka di **Authentication** >
**Sign In / Providers** > *Allow new users to sign up*. Tanpa itu, siapa pun
bisa membuat akun - mereka tetap tidak akan lolos `NUXT_ADMIN_EMAILS`, tapi
menutup dua lapis lebih baik daripada satu.

Lupa kata sandi diselesaikan dari Supabase Dashboard juga (Users > ⋯ >
*Send password recovery*). Tautan pemulihannya mendarat di `/confirm`.

## Halaman

| Rute | Isi |
| --- | --- |
| `/` | Daftar pesanan: ringkasan per status, filter, ubah status |
| `/login` | Masuk dengan email & kata sandi |
| `/confirm` | Pendaratan tautan email (undangan akun, pemulihan kata sandi) |

Seluruh rute selain `/login` dan `/confirm` dijaga middleware global
`@nuxtjs/supabase`; pengunjung tanpa sesi dilempar ke `/login`, dan
dikembalikan ke halaman yang tadi dituju setelah berhasil masuk.

### Filter tinggal di URL

Status, pencarian, dan rentang tanggal kirim semuanya query string
(`/?status=baru&from=2026-09-20`). Tautannya bisa dikirim ke sesama admin
apa adanya, dan tombol back peramban bekerja seperti yang diharapkan.

Filter dan paginasi dikerjakan Postgres, bukan disaring di browser - tabel
pesanan hanya akan bertambah panjang.

## Struktur

```
app/
  components/      OrderCard, OrderStatusBadge
  layouts/         default (dengan header), auth (untuk /login & /confirm)
  pages/           index, login, confirm
server/
  api/
    orders.get.ts        daftar pesanan (filter + paginasi)
    orders/[id].patch.ts ubah status satu pesanan
    summary.get.ts       jumlah pesanan per status
  utils/admin.ts         gerbang requireAdmin() untuk seluruh rute di atas
shared/
  types/order.ts   bentuk baris orders & order_items
  utils/order.ts   daftar status, format rupiah/tanggal, tautan wa.me
```

`shared/` adalah direktori Nuxt 4 yang auto-import ke halaman Vue maupun rute
server sekaligus - dipakai supaya daftar status dan bentuk data tidak ditulis
dua kali lalu diam-diam berbeda.
