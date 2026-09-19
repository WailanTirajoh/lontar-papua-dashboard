/**
 * Bentuk data yang dipakai halaman Vue maupun rute server.
 *
 * Semuanya diturunkan dari `Database` di ./database, bukan ditulis ulang:
 * satu daftar kolom yang bisa basi sudah cukup, dua daftar yang diam-diam
 * berbeda jauh lebih mahal.
 */

import type { Database, OrderStatus } from './database'

export type OrderItem = Database['public']['Tables']['order_items']['Row']

/** Satu pesanan beserta rinciannya, seperti dibalas /api/orders. */
export type Order = Database['public']['Tables']['orders']['Row'] & {
  order_items: OrderItem[]
}

export interface OrderListResult {
  orders: Order[]
  /** Total baris yang cocok dengan filter, bukan jumlah di halaman ini. */
  total: number
  page: number
  pageSize: number
}

/** Jumlah pesanan per status, untuk kartu ringkasan di atas daftar. */
export type OrderSummary = Record<OrderStatus, number>
