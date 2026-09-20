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

/**
 * Balasan PATCH /api/orders/:id.
 *
 * Ringkasannya ikut dikirim, bukan supaya halaman hemat satu permintaan
 * (itu cuma efek sampingnya), melainkan supaya angkanya tetap benar ketika
 * dua admin bekerja bersamaan: dihitung ulang di server setelah update, jadi
 * perubahan admin lain ikut terhitung. Menggesernya sendiri di browser hanya
 * benar bila tidak ada orang lain yang menyentuh tabel.
 */
export interface OrderPatchResult {
  order: Order
  /**
   * `null` bila status sudah tersimpan tapi penghitungan ringkasannya gagal -
   * perubahan yang sudah jadi tidak pantas dilaporkan sebagai kegagalan hanya
   * karena angka hiasan di atasnya tidak terkumpul.
   */
  summary: OrderSummary | null
}
