import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxtjs/supabase'
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()]
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'Dashboard Lontar Papua',
      meta: [
        { name: 'theme-color', content: '#3d2314' },
        // Dashboard internal: tidak ada satu pun halaman yang pantas muncul
        // di hasil pencarian.
        { name: 'robots', content: 'noindex, nofollow' }
      ]
    }
  },

  // Kebalikan dari situs pembeli yang di-prerender: setiap halaman di sini
  // bergantung pada sesi login dan data yang berubah tiap menit, jadi tidak
  // ada satu pun rute yang boleh dibekukan jadi HTML statis.
  nitro: {
    prerender: { routes: [] }
  },

  supabase: {
    // url & key diisi dari NUXT_PUBLIC_SUPABASE_URL dan
    // NUXT_PUBLIC_SUPABASE_KEY; secretKey dari NUXT_SUPABASE_SECRET_KEY.
    // Ketiganya sengaja tidak ditulis di sini supaya tidak ada nilai yang
    // ikut ter-commit.

    // Seluruh halaman dijaga modul ini: pengunjung tanpa sesi dilempar ke
    // /login. `login` dan `callback` otomatis dikecualikan, jadi daftar
    // `exclude` hanya perlu memuat halaman publik tambahan - sampai sekarang
    // tidak ada satu pun.
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: [],
      // Tautan yang dibuka sebelum login (misal /?status=baru) disimpan ke
      // cookie supaya /confirm bisa mengembalikan admin ke sana.
      saveRedirectToCookie: true
    },

    // Cermin skema di shared/types/database.ts, bukan lokasi bawaan
    // (~/types/database.types.ts): berkas itu ada di dalam app/, sementara
    // rute server membutuhkannya juga.
    types: '~~/shared/types/database.ts'
  },

  runtimeConfig: {
    // Daftar email yang boleh membuka dashboard, dipisah koma. Sengaja di
    // luar `public`: hanya dibaca server/utils/admin.ts saat memeriksa sesi,
    // dan daftar email admin tidak perlu ikut terkirim ke browser.
    //
    // Sengaja TIDAK punya nilai default. Supabase Auth menerima pendaftaran
    // siapa pun bila provider email dibiarkan terbuka, jadi "sudah login"
    // saja bukan izin - kosongnya daftar ini berarti tidak ada yang bisa
    // membaca pesanan, bukan semua orang bisa. Isi lewat NUXT_ADMIN_EMAILS.
    adminEmails: ''
  }
})
