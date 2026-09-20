/**
 * Bentuk data kode referal, diturunkan dari `Database` di ./database seperti
 * halnya ./order - bukan ditulis ulang.
 */

import type { Database } from './database'

export type Referral = Database['public']['Tables']['referrals']['Row'] & {
  /**
   * Jumlah pesanan yang memakai kode ini, dihitung di /api/referrals.
   * `orders.referral_code` cuma teks tanpa foreign key, jadi angka ini
   * memang hasil hitungan - bukan kolom yang bisa dibaca dari barisnya.
   */
  order_count: number
}

export interface ReferralListResult {
  referrals: Referral[]
  /** Total baris yang cocok dengan filter, bukan jumlah di halaman ini. */
  total: number
  page: number
  pageSize: number
}

/**
 * Isian formulir tambah/ubah. Semua teks string - `<input>` tidak mengenal
 * null, dan rute server yang mengubah string kosong jadi null saat menyimpan.
 */
export interface ReferralDraft {
  code: string
  is_active: boolean
  referrer_name: string
  referrer_phone: string
  notes: string
}
