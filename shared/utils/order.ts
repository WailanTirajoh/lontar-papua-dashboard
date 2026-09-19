import type { OrderStatus } from '../types/database'

/**
 * Daftar status pesanan beserta labelnya.
 *
 * Urutannya adalah alur kerja dapur - baru, diproses, selesai - dengan
 * `batal` di ujung. Nilai `value` wajib sama persis dengan CHECK
 * `orders_status_known` di migrasi; menambah status di sini tanpa mengubah
 * migrasi hanya akan ditolak Postgres saat disimpan.
 */
export const orderStatuses = [
  { value: 'baru', label: 'Baru' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'batal', label: 'Batal' }
] as const satisfies ReadonlyArray<{ value: OrderStatus, label: string }>

export const orderStatusValues = orderStatuses.map((s) => s.value)

export function orderStatusLabel(status: string) {
  return orderStatuses.find((s) => s.value === status)?.label ?? status
}

/**
 * Rupiah tanpa desimal: tidak ada sen di IDR, dan seluruh angka di database
 * memang sudah bilangan bulat.
 */
export function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * `YYYY-MM-DD` apa adanya jadi tanggal terbaca, tanpa sekali pun melewati
 * `new Date()`: string tanggal polos di-parse sebagai UTC, sehingga di
 * perangkat berzona barat tanggal kirim bisa mundur sehari.
 */
export function formatTanggal(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

/**
 * Waktu pesanan masuk, selalu dalam jam Jakarta - dapurnya di sana, dan
 * admin yang membuka dashboard sambil jalan tidak boleh melihat jam yang
 * bergeser mengikuti zona perangkatnya.
 */
export function formatWaktu(timestamp: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).format(new Date(timestamp))
}

/**
 * Nomor apa adanya dari pembeli jadi tautan wa.me: "0812-3456" maupun
 * "+62 812 3456" sama-sama berakhir sebagai 628123456. Mengikuti
 * normalizeWhatsAppNumber() di situs pembeli.
 */
export function waLink(phone: string | null) {
  if (!phone) return null

  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null

  const normalized = digits.startsWith('62')
    ? digits
    : `62${digits.replace(/^0+/, '')}`

  return `https://wa.me/${normalized}`
}
