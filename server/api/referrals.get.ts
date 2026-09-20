/**
 * Daftar kode referal untuk halaman /referal.
 *
 * Dibaca dengan secret key, jadi requireAdmin() harus lolos lebih dulu -
 * lihat server/utils/admin.ts. Tabel ini memakai RLS tanpa policy sama seperti
 * `orders`: daftar kode beserta nama dan nomor pereferensinya memang tidak
 * boleh terjangkau dari browser, dan situs pembeli pun hanya boleh tahu satu
 * kode valid atau tidak.
 */

import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

/** Sama dengan /api/orders: cukup untuk satu layar, cukup ringan untuk 4G. */
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

const querySchema = z.object({
  /** Cari kode, nama, atau nomor pereferensi. */
  q: z.string().trim().max(60).optional(),
  /** Saring per status; tanpa ini, aktif dan nonaktif sama-sama tampil. */
  status: z.enum(['aktif', 'nonaktif']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE)
})

export default defineEventHandler(async (event): Promise<ReferralListResult> => {
  await requireAdmin(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Filter tidak valid' })
  }

  const { q, status, page, pageSize } = parsed.data
  const client = serverSupabaseServiceRole(event)

  // Kode aktif di atas: yang sedang berlaku itulah yang dicari admin saat
  // pembeli menyebut kodenya di chat.
  let query = client
    .from('referrals')
    .select('*', { count: 'exact' })
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('is_active', status === 'aktif')

  if (q) {
    // Alasan yang sama dengan /api/orders: koma dan kutip memisahkan cabang
    // di dalam .or() PostgREST, jadi dibuang supaya pencarian tidak diam-diam
    // berubah jadi kondisi yang tidak diminta.
    const safe = q.replace(/[,()"*]/g, ' ').trim()
    if (safe) {
      query = query.or(
        `code.ilike.%${safe}%,referrer_name.ilike.%${safe}%,referrer_phone.ilike.%${safe}%`
      )
    }
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[referrals] gagal membaca daftar kode referal')
    console.error(error)
    throw createError({ statusCode: 502, statusMessage: 'Gagal membaca kode referal' })
  }

  return {
    referrals: await withOrderCounts(event, data ?? []),
    total: count ?? 0,
    page,
    pageSize
  }
})
