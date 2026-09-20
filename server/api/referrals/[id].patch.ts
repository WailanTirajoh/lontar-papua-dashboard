/**
 * Ubah satu kode referal: kodenya sendiri, status aktif, nama, nomor, catatan.
 *
 * Mematikan kode lebih disarankan daripada menghapusnya - lihat
 * `[id].delete.ts`. Mengganti `code` juga diizinkan (salah ketik memang
 * terjadi), dengan satu akibat yang perlu disadari: pesanan lama menyimpan
 * kodenya sebagai teks, jadi pesanan yang terlanjur memakai kode lama tidak
 * ikut berubah.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event): Promise<Referral> => {
  const { email } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Id kode referal tidak valid' })
  }

  const parsed = referralPatchSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Isian kode referal tidak valid'
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada yang diubah' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('referrals')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    const known = referralWriteError(error)
    if (known) throw known

    console.error(`[referrals] gagal mengubah kode referal ${id}`)
    console.error(error)
    throw createError({ statusCode: 502, statusMessage: 'Gagal menyimpan kode referal' })
  }

  // maybeSingle() membalas null, bukan error, ketika tidak ada baris yang
  // cocok - jadi id yang sudah terhapus tampil sebagai 404, bukan 502.
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Kode referal tidak ditemukan' })
  }

  console.info(`[referrals] ${email} mengubah kode ${data.code}`)

  // Dihitung ulang: kodenya bisa saja baru diganti, dan angka pemakaian
  // mengikuti kode yang sekarang.
  const [withCount] = await withOrderCounts(event, [data])
  return withCount!
})
