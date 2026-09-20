/**
 * Tambah satu kode referal.
 *
 * Berbeda dengan `orders` yang hanya bisa diubah statusnya, tabel ini memang
 * milik admin sepenuhnya: isinya daftar kerja pemilik usaha, bukan salinan
 * penawaran yang harus tetap utuh sebagai bukti.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event): Promise<Referral> => {
  const { email } = await requireAdmin(event)

  const parsed = referralBodySchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Isian kode referal tidak valid'
    })
  }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('referrals')
    .insert(parsed.data)
    .select('*')
    .single()

  if (error) {
    const known = referralWriteError(error)
    if (known) throw known

    console.error('[referrals] gagal menambah kode referal')
    console.error(error)
    throw createError({ statusCode: 502, statusMessage: 'Gagal menyimpan kode referal' })
  }

  console.info(`[referrals] ${email} menambah kode ${data.code}`)

  // Kode baru belum mungkin dipakai pesanan mana pun, jadi hitungannya nol
  // tanpa perlu bertanya ke database.
  return { ...data, order_count: 0 }
})
