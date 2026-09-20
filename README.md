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
| `referrals` | **dashboard ini** | halaman kelola kode referal |

Bentuk kolomnya ada di `supabase/migrations/` pada repo situs pembeli, dan
disalin sebagai tipe TypeScript di `shared/types/database.ts`. **Migrasi tinggal
di repo situs pembeli**; bila skema berubah di sana, berkas tipe di sini yang
menyesuaikan - jangan membuat migrasi tandingan di repo ini, karena dua repo
yang sama-sama memigrasikan satu database adalah cara tercepat membuat keduanya
saling menimpa.

Dashboard hanya menulis dua hal:

- kolom `status` pada `orders` (`baru` → `diproses` → `selesai`, atau `batal`);
- seluruh isi `referrals` - tambah, ubah, aktif/nonaktif, hapus.

Bedanya disengaja. Baris `orders` adalah salinan penawaran pada saat pembeli
menekan kirim, jadi nota lama tidak boleh bisa diedit belakangan. Tabel
`referrals` sebaliknya memang daftar kerja pemilik usaha - dulu sebuah Google
Spreadsheet - dan memang untuk diubah.

### Kenapa datanya dibaca lewat `server/api`, bukan langsung dari browser

Migrasi di situs pembeli menyalakan RLS pada ketiga tabel **tanpa satu pun
policy**, lalu mencabut grant `anon` dan `authenticated`. Artinya publishable
key yang ikut ke browser memang tidak bisa membaca apa pun - disengaja, supaya
data pembeli, dan daftar kode referal beserta nomor pereferensinya, tidak
pernah terjangkau dari sisi klien.

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
| `/referal` | Kelola kode referal: tambah, ubah, aktif/nonaktif, hapus |
| `/login` | Masuk dengan email & kata sandi |
| `/confirm` | Pendaratan tautan email (undangan akun, pemulihan kata sandi) |

Seluruh rute selain `/login` dan `/confirm` dijaga middleware global
`@nuxtjs/supabase`; pengunjung tanpa sesi dilempar ke `/login`, dan
dikembalikan ke halaman yang tadi dituju setelah berhasil masuk.

### Kode referal

Halaman `/referal` adalah pengganti Google Spreadsheet yang dulu dibaca situs
pembeli lewat Apps Script. Kolomnya sama artinya dengan kolom sheet lama:

| Kolom | Dulu di sheet | Arti |
| --- | --- | --- |
| `code` | Kode | Selalu huruf besar; pola `^[A-Z0-9_-]{2,32}$` |
| `is_active` | Aktif (checkbox) | Hanya kode aktif yang diterima formulir `/pesan` |
| `referrer_name` | Nama | Milik admin, tidak pernah dikirim ke pengunjung |
| `referrer_phone` | No Whatsapp | idem; ditampilkan sebagai tautan wa.me |
| `notes` | Catatan | idem |

Perubahan langsung berlaku: situs pembeli membaca tabelnya per permintaan dan
tidak lagi menahan hasilnya 60 detik seperti versi Apps Script.

Angka "N pesanan" di tiap kartu dihitung dari `orders.referral_code`, bukan
dibaca dari kolom - kolom itu sengaja hanya teks tanpa foreign key supaya nota
lama tidak ikut berubah ketika kode referalnya diganti atau dihapus. Karena
itu pula **menonaktifkan kode lebih disarankan daripada menghapusnya**: nota
lamanya memang tetap utuh, tapi catatan siapa pereferensinya hilang.

Pemindahan isi spreadsheet ke tabel ini dilakukan sekali, dengan
`scripts/referal-csv-ke-sql.mjs` di repo situs pembeli. Langkahnya ada di
README repo itu, bagian *Kode referal → Pindahan dari Google Spreadsheet*.

### Filter tinggal di URL

Status, pencarian, dan rentang tanggal kirim semuanya query string
(`/?status=baru&from=2026-09-20`, `/referal?status=nonaktif`). Tautannya bisa
dikirim ke sesama admin apa adanya, dan tombol back peramban bekerja seperti
yang diharapkan.

Filter dan paginasi dikerjakan Postgres, bukan disaring di browser - tabel
pesanan hanya akan bertambah panjang.

## Struktur

```
app/
  components/      OrderCard, OrderStatusBadge, ReferralCard, ReferralFields
  layouts/         default (dengan header), auth (untuk /login & /confirm)
  pages/           index, referal, login, confirm
  utils/error.ts   pesan yang pantas ditampilkan dari kegagalan $fetch
server/
  api/
    orders.get.ts           daftar pesanan (filter + paginasi)
    orders/[id].patch.ts    ubah status satu pesanan
    summary.get.ts          jumlah pesanan per status
    referrals.get.ts        daftar kode referal (filter + paginasi + pemakaian)
    referrals.post.ts       tambah kode referal
    referrals/[id].patch.ts ubah satu kode referal
    referrals/[id].delete.ts hapus satu kode referal
  utils/
    admin.ts            gerbang requireAdmin() untuk seluruh rute di atas
    referral-body.ts    skema zod & pesan galat tulis kode referal
    referral-usage.ts   jumlah pesanan per kode
shared/
  types/order.ts      bentuk baris orders & order_items
  types/referral.ts   bentuk baris referrals & isian formulirnya
  utils/order.ts      daftar status, format rupiah/tanggal, tautan wa.me
  utils/referral.ts   pola kode, batas kolom, normalisasi huruf besar
```

`shared/` adalah direktori Nuxt 4 yang auto-import ke halaman Vue maupun rute
server sekaligus - dipakai supaya daftar status dan bentuk data tidak ditulis
dua kali lalu diam-diam berbeda.
