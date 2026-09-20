/**
 * Hapus satu kode referal.
 *
 * Disediakan untuk kode yang memang tidak seharusnya ada - salah ketik saat
 * menambah, atau sisa uji coba. Untuk kode yang pernah dipakai, mematikannya
 * (`is_active = false`) jauh lebih baik: `orders.referral_code` hanya teks
 * tanpa foreign key, jadi pesanan lama tidak rusak ketika barisnya dihapus -
 * yang hilang justru catatan siapa pereferensinya.
 *
 * Halaman /referal karena itu meminta konfirmasi lebih dulu dan menyebut
 * jumlah pesanan yang memakai kode itu.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { email } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Id kode referal tidak valid' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('referrals')
    .delete()
    .eq('id', id)
    .select('code')
    .maybeSingle()

  if (error) {
    console.error(`[referrals] gagal menghapus kode referal ${id}`)
    console.error(error)
    throw createError({ statusCode: 502, statusMessage: 'Gagal menghapus kode referal' })
  }

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Kode referal tidak ditemukan' })
  }

  console.info(`[referrals] ${email} menghapus kode ${data.code}`)

  return { deleted: true }
})
