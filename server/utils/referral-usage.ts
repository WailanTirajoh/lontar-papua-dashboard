/**
 * Menempelkan jumlah pesanan ke tiap kode referal.
 *
 * `orders.referral_code` sengaja hanya teks tanpa foreign key - baris pesanan
 * adalah salinan penawaran saat pembeli menekan kirim, dan menghapus kode
 * referal tidak boleh ikut menghapus atau mengubah nota lama. Konsekuensinya
 * angka pemakaian memang harus dihitung, bukan dibaca dari kolom.
 *
 * Dihitung Postgres dengan `head: true` - hanya angkanya yang dikirim, tidak
 * satu baris pesanan pun - dan hanya untuk kode di halaman yang sedang tampil,
 * jadi paling banyak sejumlah pageSize hitungan yang berjalan berbarengan.
 * Pola yang sama dengan server/api/summary.get.ts.
 */

import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

type ReferralRow = Omit<Referral, 'order_count'>

export async function withOrderCounts(event: H3Event, rows: ReferralRow[]): Promise<Referral[]> {
  if (rows.length === 0) return []

  const client = serverSupabaseServiceRole(event)

  return Promise.all(
    rows.map(async (row) => {
      const { count, error } = await client
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('referral_code', row.code)

      if (error) {
        // Kode tetap tampil tanpa angkanya: gagal menghitung pemakaian bukan
        // alasan menyembunyikan seluruh daftar dari admin.
        console.error(`[referrals] gagal menghitung pemakaian kode ${row.code}`)
        console.error(error)
        return { ...row, order_count: 0 }
      }

      return { ...row, order_count: count ?? 0 }
    })
  )
}
