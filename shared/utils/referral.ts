/**
 * Aturan kode referal, dipakai halaman Vue maupun rute server.
 *
 * Polanya sama persis dengan constraint `referrals_code_fmt` di migrasi repo
 * situs pembeli dan dengan CODE_PATTERN di `server/api/referral.get.ts` milik
 * situs itu. Menuliskannya di sini membuat kode yang salah ketik ditolak
 * sebelum menyentuh database, dengan pesan yang bisa dibaca admin - bukan
 * sebagai 400 mentah dari Postgres.
 */

import type { Referral, ReferralDraft } from '../types/referral'

export const REFERRAL_CODE_PATTERN = /^[A-Z0-9_-]{2,32}$/

/** Batas kolom teks, sama dengan CHECK constraint di migrasi. */
export const REFERRAL_LIMITS = { name: 80, phone: 30, notes: 500 } as const

/**
 * Kode apa adanya dari isian jadi bentuk yang disimpan: tanpa spasi di tepi
 * dan selalu huruf besar. Situs pembeli mencari dengan kode yang sudah
 * di-upper-case, jadi kode yang tersimpan huruf kecil tidak akan pernah
 * ketemu - normalisasi ini yang mencegahnya.
 */
export function normalizeReferralCode(code: string) {
  return code.trim().toUpperCase()
}

/** Label status, sejajar dengan orderStatusLabel() di ./order. */
export function referralStatusLabel(isActive: boolean) {
  return isActive ? 'Aktif' : 'Nonaktif'
}

/** Isian kosong untuk formulir tambah. */
export function emptyReferralDraft(): ReferralDraft {
  return { code: '', is_active: true, referrer_name: '', referrer_phone: '', notes: '' }
}

/** Baris dari server jadi isian formulir; null jadi string kosong. */
export function referralToDraft(referral: Referral): ReferralDraft {
  return {
    code: referral.code,
    is_active: referral.is_active,
    referrer_name: referral.referrer_name ?? '',
    referrer_phone: referral.referrer_phone ?? '',
    notes: referral.notes ?? ''
  }
}
