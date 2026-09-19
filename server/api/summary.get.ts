/**
 * Jumlah pesanan per status, untuk deretan kartu di atas daftar.
 *
 * Hanya dipakai saat halaman pertama kali dimuat. Setiap perubahan status
 * sesudahnya mendapat angka barunya dari balasan PATCH /api/orders/:id, jadi
 * tidak ada permintaan kedua ke sini - lihat server/utils/orderSummary.ts.
 */

export default defineEventHandler(async (event): Promise<OrderSummary> => {
  await requireAdmin(event)

  try {
    return await readOrderSummary(event)
  } catch (error) {
    console.error('[summary] gagal menghitung pesanan per status')
    console.error(error)
    throw createError({ statusCode: 502, statusMessage: 'Gagal membaca ringkasan' })
  }
})
