/**
 * Cermin skema Supabase yang dipakai kedua aplikasi.
 *
 * Bentuknya sengaja sama dengan keluaran `supabase gen types typescript`,
 * sehingga berkas ini bisa ditimpa hasil generate kapan saja tanpa menyentuh
 * kode lain. `supabase.types` di nuxt.config menunjuk ke sini, dan dari situ
 * @nuxtjs/supabase memberi tipe pada seluruh query - termasuk `update()`,
 * yang tanpa tipe hanya menerima `never`.
 *
 * Sumber kebenarannya tetap migrasi di repo situs pembeli
 * (`supabase/migrations/`). Repo ini membaca pesanan, mengubah
 * `orders.status`, dan mengelola seluruh isi `referrals`; migrasi tidak boleh
 * dibuat dari sini - dua repo yang sama-sama memigrasikan satu database akan
 * saling menimpa.
 *
 * Satu penyimpangan dari hasil generate, disengaja: `status` ditulis sebagai
 * union, bukan `string`. Kolomnya memang `text`, tapi CHECK
 * `orders_status_known` membatasinya ke empat nilai - dan generator tidak
 * bisa melihat CHECK constraint. Menuliskannya di sini membuat status yang
 * salah ketik ketahuan saat compile, bukan sebagai 400 dari Postgres.
 */

export type OrderStatus = 'baru' | 'diproses' | 'selesai' | 'batal'

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: number
          created_at: string
          customer_name: string
          customer_phone: string | null
          /** `YYYY-MM-DD`: formulir hanya menanyakan tanggal, bukan instant. */
          delivery_date: string
          courier: string
          is_pickup: boolean
          address: string | null
          notes: string | null
          referral_code: string | null
          /** Hasil pengecekan ulang di server, bukan klaim dari browser. */
          referral_verified: boolean
          /** Rupiah bulat; tidak ada sen di IDR. */
          subtotal_idr: number
          addon_idr: number
          total_idr: number
          status: OrderStatus
          source_page: string | null
        }
        Insert: never
        Update: {
          // Hanya status. Baris pesanan adalah salinan penawaran saat pembeli
          // menekan kirim; nota lama yang bisa diedit belakangan tidak lagi
          // bisa dipakai sebagai bukti apa pun.
          status?: OrderStatus
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: number
          created_at: string
          /** Diisi trigger referrals_set_updated_at, bukan oleh pemanggil. */
          updated_at: string
          /** Selalu huruf besar; pola `^[A-Z0-9_-]{2,32}$`. */
          code: string
          /** Hanya kode aktif yang dianggap valid oleh situs pembeli. */
          is_active: boolean
          referrer_name: string | null
          referrer_phone: string | null
          notes: string | null
        }
        Insert: {
          code: string
          is_active?: boolean
          referrer_name?: string | null
          referrer_phone?: string | null
          notes?: string | null
        }
        Update: {
          // id, created_at, dan updated_at sengaja tidak ada: dua yang pertama
          // milik database, yang terakhir diisi trigger.
          code?: string
          is_active?: boolean
          referrer_name?: string | null
          referrer_phone?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: number
          order_id: number
          product_id: string
          product_name: string
          unit: string
          qty: number
          /** Hanya terisi untuk Lontar Slice. */
          slice_count: number | null
          with_hampers: boolean
          unit_price_idr: number
          line_total_idr: number
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
