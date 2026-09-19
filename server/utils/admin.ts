/**
 * Gerbang setiap rute di server/api.
 *
 * Tabel `orders` dan `order_items` memakai RLS tanpa satu pun policy, dan
 * grant untuk anon/authenticated sudah dicabut di migrasi situs pembeli -
 * artinya kunci publishable yang ikut ke browser tidak bisa membaca apa pun.
 * Satu-satunya jalan masuk adalah secret key di sisi server, dan kunci itu
 * melewati seluruh RLS. Jadi pemeriksaan siapa yang boleh membaca tidak
 * bisa diserahkan ke database seperti biasanya; harus terjadi di sini,
 * sebelum kunci itu dipakai.
 *
 * Konsekuensinya: tidak ada satu pun handler yang boleh memanggil
 * serverSupabaseServiceRole() sebelum requireAdmin() lolos.
 */

import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

/** Daftar email admin dari NUXT_ADMIN_EMAILS, dinormalisasi jadi huruf kecil. */
function adminEmails(event: H3Event) {
  return String(useRuntimeConfig(event).adminEmails)
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Balikan: email admin yang sedang login. Melempar bila tidak - pemanggil
 * tidak perlu memeriksa apa pun lagi.
 *
 * Status sengaja dibedakan: 401 berarti "silakan login" (klien melempar ke
 * /login), 403 berarti "akun ini memang bukan admin" - dua hal yang
 * penanganannya di browser berbeda.
 */
export async function requireAdmin(event: H3Event) {
  // Klaim JWT hasil verifikasi @nuxtjs/supabase, bukan header yang bisa
  // dikarang pemanggil.
  const claims = await serverSupabaseUser(event)
  if (!claims) {
    throw createError({ statusCode: 401, statusMessage: 'Belum login' })
  }

  const allowed = adminEmails(event)
  if (allowed.length === 0) {
    // Gagal tertutup. Membuka dashboard untuk "siapa pun yang punya sesi"
    // ketika daftar ini lupa diisi sama saja dengan membuka data pembeli
    // ke siapa pun yang berhasil mendaftar di Supabase Auth.
    console.error('[admin] NUXT_ADMIN_EMAILS kosong - seluruh akses ditolak')
    throw createError({ statusCode: 503, statusMessage: 'Daftar admin belum dikonfigurasi' })
  }

  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : ''
  if (!email || !allowed.includes(email)) {
    throw createError({ statusCode: 403, statusMessage: 'Akun ini tidak terdaftar sebagai admin' })
  }

  return { email }
}
