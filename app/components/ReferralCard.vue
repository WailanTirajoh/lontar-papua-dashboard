<script setup lang="ts">
/**
 * Satu kode referal: tampilan ringkas, ubah di tempat, dan hapus.
 *
 * Tidak ada halaman detail - seluruh isi barisnya muat di satu kartu, dan
 * pekerjaan admin di sini memang cuma menghidupkan, mematikan, atau
 * membetulkan satu-dua kolom.
 */

const props = defineProps<{ referral: Referral }>()
const emit = defineEmits<{ updated: [referral: Referral], removed: [id: number] }>()

const editing = ref(false)
const saving = ref(false)
const errorMessage = ref('')

const draft = ref<ReferralDraft>(referralToDraft(props.referral))

const phoneLink = computed(() => waLink(props.referral.referrer_phone))

const canSave = computed(() =>
  !saving.value && REFERRAL_CODE_PATTERN.test(draft.value.code)
)

function startEdit() {
  // Isian selalu dimulai dari baris yang benar-benar tersimpan, bukan dari
  // sisa suntingan yang tadi dibatalkan.
  draft.value = referralToDraft(props.referral)
  errorMessage.value = ''
  editing.value = true
}

/**
 * Baris hasil dari server yang dipakai, bukan isian di layar - sama seperti
 * OrderCard: kartu tidak boleh menampilkan perubahan yang ternyata gagal
 * tersimpan.
 */
async function save(body: Partial<ReferralDraft>) {
  saving.value = true
  errorMessage.value = ''

  try {
    const updated = await $fetch<Referral>(`/api/referrals/${props.referral.id}`, {
      method: 'PATCH',
      body
    })
    emit('updated', updated)
    editing.value = false
  } catch (error) {
    errorMessage.value = errorText(error, 'Perubahan gagal disimpan.')
  } finally {
    saving.value = false
  }
}

/**
 * Tombol aktif/nonaktif terpisah dari formulir ubah: mematikan kode yang
 * kedaluwarsa adalah pekerjaan yang paling sering dilakukan, dan memaksanya
 * lewat dua klik pembuka formulir tidak ada gunanya.
 */
function toggleActive() {
  if (saving.value) return
  save({ is_active: !props.referral.is_active })
}

/** "3 pesanan", atau apa adanya bila hitungannya gagal. */
const usageLabel = computed(() =>
  props.referral.order_count === null
    ? 'pemakaian tidak terbaca'
    : `${props.referral.order_count} pesanan`
)

/**
 * Konfirmasi menyebut jumlah pesanan yang memakai kode ini: pesanan lama
 * menyimpan kodenya sebagai teks, jadi menghapus baris tidak merusak nota
 * mana pun - tapi catatan siapa pereferensinya memang hilang.
 *
 * Hitungan yang gagal (`null`) diperlakukan seperti "mungkin banyak", bukan
 * seperti nol: peringatan yang hilang justru pada kode yang paling perlu
 * diperingatkan adalah kegagalan yang paling mahal di sini.
 */
async function remove() {
  const count = props.referral.order_count
  const dipakai = count === null
    ? ' Jumlah pesanan yang memakai kode ini tidak bisa dipastikan sekarang; nota lamanya tetap menyimpan kodenya, tapi nama pereferensinya hilang.'
    : count > 0
      ? ` Kode ini sudah dipakai ${count} pesanan; nota lamanya tetap menyimpan kodenya, tapi nama pereferensinya hilang.`
      : ''

  if (!confirm(`Hapus kode ${props.referral.code}?${dipakai}\n\nUntuk kode yang sudah tidak berlaku, menonaktifkannya lebih aman.`)) return

  saving.value = true
  errorMessage.value = ''

  try {
    await $fetch(`/api/referrals/${props.referral.id}`, { method: 'DELETE' })
    emit('removed', props.referral.id)
  } catch (error) {
    errorMessage.value = errorText(error, 'Kode gagal dihapus.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <article
    class="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-warm"
    :class="!referral.is_active && 'opacity-75'"
  >
    <header class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 class="font-mono text-lg font-semibold tracking-wide text-espresso">
        {{ referral.code }}
      </h2>

      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        :class="referral.is_active
          ? 'bg-primary-container text-on-primary-container'
          : 'bg-surface-container-high text-on-surface-variant'"
      >
        {{ referralStatusLabel(referral.is_active) }}
      </span>

      <span class="ml-auto text-xs text-on-surface-variant">
        {{ usageLabel }}
      </span>
    </header>

    <dl
      v-if="!editing"
      class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2"
    >
      <div>
        <dt class="text-xs uppercase tracking-wide text-on-surface-variant">
          Pereferensi
        </dt>
        <dd class="text-on-surface">
          {{ referral.referrer_name || 'Tidak diisi' }}
        </dd>
      </div>

      <div>
        <dt class="text-xs uppercase tracking-wide text-on-surface-variant">
          Kontak
        </dt>
        <dd>
          <a
            v-if="phoneLink"
            :href="phoneLink"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 text-wa hover:underline"
          >
            <Icon name="material-symbols:chat-outline" />
            {{ referral.referrer_phone }}
          </a>
          <span
            v-else
            class="text-on-surface-variant"
          >Tidak diisi</span>
        </dd>
      </div>

      <div
        v-if="referral.notes"
        class="sm:col-span-2"
      >
        <dt class="text-xs uppercase tracking-wide text-on-surface-variant">
          Catatan
        </dt>
        <dd class="whitespace-pre-line text-on-surface">
          {{ referral.notes }}
        </dd>
      </div>
    </dl>

    <form
      v-else
      class="mt-3"
      @submit.prevent="save(draft)"
    >
      <ReferralFields
        v-model="draft"
        :id-prefix="`ref-${referral.id}`"
      />

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
          :disabled="!canSave"
        >
          {{ saving ? 'Menyimpan…' : 'Simpan' }}
        </button>
        <button
          type="button"
          class="rounded-md border border-outline-variant px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container"
          :disabled="saving"
          @click="editing = false"
        >
          Batal
        </button>
      </div>
    </form>

    <footer
      v-if="!editing"
      class="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3 text-sm"
    >
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-1.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-60"
        :disabled="saving"
        @click="toggleActive"
      >
        <Icon :name="referral.is_active ? 'material-symbols:toggle-on' : 'material-symbols:toggle-off-outline'" />
        {{ referral.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-1.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-60"
        :disabled="saving"
        @click="startEdit"
      >
        <Icon name="material-symbols:edit-outline" />
        Ubah
      </button>

      <button
        type="button"
        class="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-error hover:bg-error-container/40 disabled:opacity-60"
        :disabled="saving"
        @click="remove"
      >
        <Icon name="material-symbols:delete-outline" />
        Hapus
      </button>
    </footer>

    <p
      v-if="errorMessage"
      class="mt-3 rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container"
    >
      {{ errorMessage }}
    </p>
  </article>
</template>
