/**
 * Bentuk isian kode referal, dipakai rute POST maupun PATCH.
 *
 * Batasnya sengaja dipilih sama persis dengan CHECK constraint di migrasi repo
 * situs pembeli: kalau zod meloloskan, Postgres tidak menolak - jadi tidak ada
 * dua sumber kebenaran yang bisa berbeda diam-diam. Pola yang sama dengan
 * orderSchema di `server/api/orders.post.ts` situs pembeli.
 */

import { z } from 'zod'

/** Teks bebas opsional: string kosong berarti "dikosongkan", bukan ''. */
const optionalText = (max: number) =>
  z.string().trim().max(max).nullish().transform((value) => value || null)

export const referralBodySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => REFERRAL_CODE_PATTERN.test(value), {
      message: 'Kode hanya boleh huruf, angka, garis bawah, dan strip (2-32 karakter)'
    }),
  is_active: z.boolean().default(true),
  referrer_name: optionalText(REFERRAL_LIMITS.name),
  referrer_phone: optionalText(REFERRAL_LIMITS.phone),
  notes: optionalText(REFERRAL_LIMITS.notes)
})

/** Versi PATCH: kirim hanya kolom yang berubah. */
export const referralPatchSchema = referralBodySchema.partial()

/**
 * Pesan yang bisa dibaca admin untuk kegagalan tulis yang memang bisa terjadi
 * dalam pemakaian normal. Sisanya dibiarkan jadi 502 - itu bug, bukan isian
 * yang salah, dan menampilkan pesan Postgres apa adanya ke layar tidak
 * membantu siapa pun.
 */
export function referralWriteError(error: { code?: string }) {
  // 23505 = unique_violation pada referrals_code_key.
  if (error.code === '23505') {
    return createError({ statusCode: 409, statusMessage: 'Kode itu sudah terdaftar' })
  }
  // 23514 = check_violation; pola & panjang sudah dijaga zod, jadi ini hanya
  // muncul bila keduanya sempat berbeda.
  if (error.code === '23514') {
    return createError({ statusCode: 400, statusMessage: 'Isian kode referal tidak memenuhi aturan' })
  }
  return null
}
