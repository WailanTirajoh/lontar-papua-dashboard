/**
 * Jumlah pesanan per status, untuk deretan kartu di atas daftar.
 *
 * Dihitung Postgres dengan `head: true` - hanya angka yang dikirim, tidak
 * satu baris pun. Menghitungnya dari halaman yang sedang tampil akan salah:
 * paginasi membuat angkanya hanya mencerminkan 20 pesanan teratas.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event): Promise<OrderSummary> => {
  await requireAdmin(event)

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
  ).catch((error) => {
    console.error('[summary] gagal menghitung pesanan per status')
    console.error(error)
    throw createError({ statusCode: 502, statusMessage: 'Gagal membaca ringkasan' })
  })

  return Object.fromEntries(counts) as OrderSummary
})
