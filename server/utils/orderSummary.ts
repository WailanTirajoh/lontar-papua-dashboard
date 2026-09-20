/**
 * Jumlah pesanan per status, dihitung ulang dari database.
 *
 * Empat permintaan, bukan N+1. N+1 berarti jumlah query ikut tumbuh mengikuti
 * banyaknya baris - satu query lagi untuk tiap pesanan yang barusan dibaca.
 * Di sini jumlahnya terkunci pada panjang `orderStatuses`: empat, entah
 * tabelnya berisi sepuluh pesanan atau sejuta. Keempatnya juga berangkat
 * bersamaan, jadi biayanya satu kali tunggu, bukan empat.
 *
 * Yang benar-benar mahal justru bukan jumlah query itu, melainkan bahwa
 * `orders` belum punya indeks pada kolom `status` (lihat migrasi di repo
 * situs pembeli) - tiap COUNT memindai seluruh tabel. Pada skala pesanan kue
 * itu tidak terasa, dan indeksnya pun bukan milik repo ini. Kalau suatu saat
 * terasa, urutan perbaikannya: tambah indeks `orders (status)` di migrasi
 * situs pembeli lebih dulu; baru kalau masih kurang, pindahkan hitungannya
 * ke satu fungsi RPC berisi `count(*) filter (where ...)`.
 *
 * Bentuk satu-query lewat agregat PostgREST (`select=status,count()`)
 * sengaja tidak dipakai: Supabase mematikan agregat secara bawaan, dan
 * menyalakannya adalah setelan seluruh proyek - ikut berlaku untuk situs
 * pembeli yang memakai database yang sama. Terlalu besar untuk menghemat
 * tiga permintaan yang sudah paralel.
 *
 * `head: true` membuat Postgres hanya mengirim angkanya, tanpa satu baris
 * pun. Menghitung dari halaman yang sedang tampil bukan pilihan: paginasi
 * membuat angkanya hanya mencerminkan 20 pesanan teratas.
 *
 * Pemanggil wajib sudah melewati requireAdmin() - fungsi ini memakai secret
 * key yang menembus seluruh RLS.
 */

import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

export async function readOrderSummary(event: H3Event): Promise<OrderSummary> {
  const client = serverSupabaseServiceRole(event)

  const counts = await Promise.all(
    orderStatusValues.map(async (status) => {
      const { count, error } = await client
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)

      if (error) throw error
      return [status, count ?? 0] as const
    })
  )

  return Object.fromEntries(counts) as OrderSummary
}
