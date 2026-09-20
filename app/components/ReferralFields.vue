<script setup lang="ts">
/**
 * Isian satu kode referal, dipakai formulir tambah maupun ubah.
 *
 * Sengaja satu komponen untuk keduanya: dua salinan markup yang sama adalah
 * cara tercepat membuat batas panjang di formulir tambah dan formulir ubah
 * diam-diam berbeda.
 */

const draft = defineModel<ReferralDraft>({ required: true })

defineProps<{
  /** Membedakan id isian antar formulir di satu halaman. */
  idPrefix: string
}>()

const fieldClass = 'w-full rounded-md border border-outline-variant px-3 py-2 text-sm'
const labelClass = 'mb-1 block text-xs font-medium text-on-surface-variant'

/**
 * Kode dinaikkan jadi huruf besar sambil diketik, bukan diam-diam saat
 * disimpan: admin harus melihat bentuk yang benar-benar akan tersimpan, dan
 * situs pembeli mencari dengan kode huruf besar.
 */
const code = computed({
  get: () => draft.value.code,
  set: (value: string) => { draft.value.code = normalizeReferralCode(value) }
})

/** Kosong belum berarti salah - pesannya hanya muncul setelah ada isian. */
const codeInvalid = computed(
  () => code.value.length > 0 && !REFERRAL_CODE_PATTERN.test(code.value)
)
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <label class="sm:col-span-2">
      <span :class="labelClass">Kode referal</span>
      <input
        :id="`${idPrefix}-code`"
        v-model="code"
        type="text"
        required
        autocapitalize="characters"
        spellcheck="false"
        placeholder="BUDI10"
        :class="[fieldClass, 'font-mono tracking-wide', codeInvalid && 'border-error']"
        :aria-invalid="codeInvalid"
        :aria-describedby="`${idPrefix}-code-help`"
      >
      <span
        :id="`${idPrefix}-code-help`"
        class="mt-1 block text-xs"
        :class="codeInvalid ? 'text-error' : 'text-on-surface-variant'"
      >
        Huruf, angka, garis bawah, dan strip. 2-32 karakter.
      </span>
    </label>

    <label>
      <span :class="labelClass">Nama pereferensi</span>
      <input
        :id="`${idPrefix}-name`"
        v-model="draft.referrer_name"
        type="text"
        :maxlength="REFERRAL_LIMITS.name"
        placeholder="Opsional"
        :class="fieldClass"
      >
    </label>

    <label>
      <span :class="labelClass">No WhatsApp</span>
      <input
        :id="`${idPrefix}-phone`"
        v-model="draft.referrer_phone"
        type="tel"
        :maxlength="REFERRAL_LIMITS.phone"
        placeholder="Opsional"
        :class="fieldClass"
      >
    </label>

    <label class="sm:col-span-2">
      <span :class="labelClass">Catatan</span>
      <textarea
        :id="`${idPrefix}-notes`"
        v-model="draft.notes"
        rows="2"
        :maxlength="REFERRAL_LIMITS.notes"
        placeholder="Opsional - mis. kesepakatan komisi"
        :class="fieldClass"
      />
    </label>

    <label class="flex items-center gap-2 sm:col-span-2">
      <input
        :id="`${idPrefix}-active`"
        v-model="draft.is_active"
        type="checkbox"
        class="size-4 accent-primary"
      >
      <span class="text-sm text-on-surface">
        Aktif
        <span class="text-on-surface-variant">- hanya kode aktif yang diterima formulir pesan</span>
      </span>
    </label>
  </div>
</template>
