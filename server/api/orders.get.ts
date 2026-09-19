/**
 * Daftar pesanan untuk halaman utama dashboard.
 *
 * Dibaca dengan secret key, jadi requireAdmin() harus lolos lebih dulu -
 * lihat server/utils/admin.ts. Filter dan paginasi dikerjakan Postgres, bukan
 * di browser: tabel pesanan hanya akan bertambah panjang, dan mengirim
 * seluruhnya ke ponsel admin demi menyaring empat status jelas tidak akan
 * bertahan lama.
 */

import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

/** Selaras dengan halaman: cukup untuk satu layar, cukup ringan untuk 4G. */
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

const querySchema = z.object({
  status: z.enum(orderStatusValues).optional(),
  /** Cari nama atau nomor telepon pembeli. */
  q: z.string().trim().max(60).optional(),
  /** Rentang tanggal kirim, keduanya inklusif. */
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE)
})

export default defineEventHandler(async (event): Promise<OrderListResult> => {
  await requireAdmin(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Filter tidak valid' })
  }

  const { status, q, from, to, page, pageSize } = parsed.data
  const client = serverSupabaseServiceRole(event)

  // Item ikut dalam satu permintaan lewat embed PostgREST: satu pesanan tanpa
  // rinciannya tidak bisa dikerjakan admin, jadi tidak ada gunanya memisah
  // jadi dua bolak-balik.
  let query = client
    .from('orders')
    .select('*, order_items(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('delivery_date', from)
  if (to) query = query.lte('delivery_date', to)

  if (q) {
    // Koma dan tanda kutip memisahkan cabang di dalam .or() PostgREST, jadi
    // keduanya dibuang sebelum masuk - bukan demi SQL injection (PostgREST
    // tetap mem-parameter-kan nilainya), melainkan supaya pencarian "Budi,
    // Papua" tidak diam-diam berubah jadi dua kondisi yang tidak diminta.
    const safe = q.replace(/[,()"*]/g, ' ').trim()
    if (safe) {
      query = query.or(`customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%`)
    }
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[orders] gagal membaca daftar pesanan')
    console.error(error)
    throw createError({ statusCode: 502, statusMessage: 'Gagal membaca pesanan' })
  }

  return {
    orders: (data ?? []) as Order[],
    total: count ?? 0,
    page,
    pageSize
  }
})
