/**
 * Ubah status satu pesanan - satu-satunya tulisan yang dilakukan dashboard.
 *
 * Kolom lain sengaja tidak bisa disentuh dari sini: baris pesanan adalah
 * salinan penawaran pada saat pembeli menekan kirim, dan nota lama yang bisa
 * diedit belakangan tidak lagi bisa dipakai sebagai bukti apa pun.
 */

import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

const bodySchema = z.object({
  status: z.enum(orderStatusValues)
})

export default defineEventHandler(async (event): Promise<Order> => {
  const { email } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Id pesanan tidak valid' })
  }

  const parsed = bodySchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Status tidak dikenal' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('orders')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .select('*, order_items(*)')
    .maybeSingle()

  if (error) {
    console.error(`[orders] gagal mengubah status pesanan ${id}`)
    console.error(error)
    throw createError({ statusCode: 502, statusMessage: 'Gagal menyimpan status' })
  }

  // maybeSingle() membalas null, bukan error, ketika tidak ada baris yang
  // cocok - jadi id yang sudah terhapus tampil sebagai 404, bukan 502.
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
  }

  // Siapa mengubah apa tidak tersimpan di tabel; log server adalah satu-
  // satunya jejaknya sampai ada kebutuhan audit yang sungguhan.
  console.info(`[orders] ${email} mengubah pesanan ${id} jadi ${parsed.data.status}`)

  return data as Order
})
