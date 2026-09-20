<script setup lang="ts">
/**
 * Kelola kode referal.
 *
 * Daftarnya dulu tinggal di Google Spreadsheet dan dibaca situs pembeli lewat
 * Apps Script; sekarang di tabel `referrals` pada Supabase yang sama dengan
 * pesanan, dan halaman inilah penggantinya.
 *
 * Seperti halaman pesanan, filter tinggal di query string - tautan "kode yang
 * sudah nonaktif" bisa dikirim apa adanya, dan tombol back peramban bekerja
 * seperti yang diharapkan.
 */

const route = useRoute()
const router = useRouter()

const activeStatus = computed(() => String(route.query.status ?? ''))
const page = computed(() => Number(route.query.page) || 1)

/**
 * Cookie sesi diteruskan eksplisit: saat render di server, $fetch internal
 * memanggil /api/referrals tanpa membawa cookie peramban, sehingga
 * requireAdmin() akan melihatnya sebagai tamu dan membalas 401.
 */
const headers = useRequestHeaders(['cookie'])

const listQuery = computed(() => ({
  q: route.query.q || undefined,
  status: route.query.status || undefined,
  page: page.value
}))

const { data, status: fetchStatus, error, refresh } = await useFetch('/api/referrals', {
  query: listQuery,
  headers
})

const search = ref(String(route.query.q ?? ''))

const statusFilters = [
  { value: '', label: 'Semua' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Nonaktif' }
]

/** Sama dengan halaman pesanan: nilai kosong dibuang, halaman kembali ke 1. */
function applyQuery(patch: Record<string, string | number | undefined>) {
  const next: Record<string, string> = {}

  for (const [key, value] of Object.entries({ ...route.query, ...patch })) {
    const text = String(value ?? '').trim()
    if (text) next[key] = text
  }

  if (!('page' in patch)) delete next.page

  router.push({ query: next })
}

const adding = ref(false)
const saving = ref(false)
const formError = ref('')
const draft = ref<ReferralDraft>(emptyReferralDraft())

const canSave = computed(() => !saving.value && REFERRAL_CODE_PATTERN.test(draft.value.code))

function openForm() {
  draft.value = emptyReferralDraft()
  formError.value = ''
  adding.value = true
}

/**
 * Kode baru disisipkan ke daftar yang sedang tampil, bukan memuat ulang
 * seluruh halaman: pemilik usaha biasanya menambahkan beberapa kode
 * berturut-turut, dan daftar yang melompat tiap kali membuat urutan kerjanya
 * mudah hilang. Filter yang aktif sengaja tidak diperiksa - kode yang baru
 * ditambah tetap terlihat sebentar meski tidak cocok, dan muat ulang
 * berikutnya yang merapikannya.
 */
async function create() {
  saving.value = true
  formError.value = ''

  try {
    const created = await $fetch<Referral>('/api/referrals', {
      method: 'POST',
      body: draft.value
    })

    if (data.value) {
      data.value = {
        ...data.value,
        referrals: [created, ...data.value.referrals],
        total: data.value.total + 1
      }
    }

    adding.value = false
  } catch (err) {
    formError.value = errorText(err, 'Kode gagal disimpan.')
  } finally {
    saving.value = false
  }
}

function replaceReferral(updated: Referral) {
  if (!data.value) return

  data.value = {
    ...data.value,
    referrals: data.value.referrals.map((r) => r.id === updated.id ? updated : r)
  }
}

function removeReferral(id: number) {
  if (!data.value) return

  data.value = {
    ...data.value,
    referrals: data.value.referrals.filter((r) => r.id !== id),
    total: Math.max(0, data.value.total - 1)
  }
}

const totalPages = computed(() => {
  if (!data.value?.total) return 1
  return Math.ceil(data.value.total / data.value.pageSize)
})

/** 403 berarti akunnya sah tapi bukan admin - saran perbaikannya berbeda. */
const forbidden = computed(() => error.value?.statusCode === 403)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="font-display text-2xl font-semibold text-espresso">
        Referal
      </h1>

      <button
        type="button"
        class="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
        @click="adding ? adding = false : openForm()"
      >
        <Icon :name="adding ? 'material-symbols:close' : 'material-symbols:add'" />
        {{ adding ? 'Tutup' : 'Tambah kode' }}
      </button>
    </div>

    <p class="mt-1 text-sm text-on-surface-variant">
      Kode aktif diterima formulir pesan di situs pembeli. Perubahan di sini
      langsung berlaku - tidak perlu deploy ulang.
    </p>

    <form
      v-if="adding"
      class="mt-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
      @submit.prevent="create"
    >
      <h2 class="mb-3 font-display text-lg font-semibold text-espresso">
        Kode baru
      </h2>

      <ReferralFields
        v-model="draft"
        id-prefix="baru"
      />

      <p
        v-if="formError"
        class="mt-3 rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container"
      >
        {{ formError }}
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
          :disabled="!canSave"
        >
          {{ saving ? 'Menyimpan…' : 'Simpan kode' }}
        </button>
        <button
          type="button"
          class="rounded-md border border-outline-variant px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container"
          :disabled="saving"
          @click="adding = false"
        >
          Batal
        </button>
      </div>
    </form>

    <form
      class="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
      @submit.prevent="applyQuery({ q: search })"
    >
      <label class="min-w-48 flex-1">
        <span class="mb-1 block text-xs font-medium text-on-surface-variant">Kode, nama, atau nomor</span>
        <input
          v-model="search"
          type="search"
          placeholder="Cari kode referal…"
          class="w-full rounded-md border border-outline-variant px-3 py-2 text-sm"
        >
      </label>

      <div class="flex gap-2">
        <button
          v-for="option in statusFilters"
          :key="option.value"
          type="button"
          class="rounded-md border px-3 py-2 text-sm transition-colors"
          :class="activeStatus === option.value
            ? 'border-primary bg-primary-container/30 text-on-surface'
            : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'"
          @click="applyQuery({ status: option.value || undefined })"
        >
          {{ option.label }}
        </button>
      </div>

      <button
        type="submit"
        class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
      >
        Cari
      </button>
    </form>

    <p
      v-if="forbidden"
      class="mt-6 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container"
    >
      Akun ini belum terdaftar sebagai admin. Tambahkan emailnya ke
      <code>NUXT_ADMIN_EMAILS</code>, lalu muat ulang halaman.
    </p>

    <div
      v-else-if="error"
      class="mt-6 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container"
    >
      <p>Kode referal gagal dimuat.</p>
      <button
        type="button"
        class="mt-2 rounded-md border border-on-error-container/30 px-3 py-1.5 font-medium"
        @click="refresh()"
      >
        Coba lagi
      </button>
    </div>

    <p
      v-else-if="fetchStatus === 'pending'"
      class="mt-6 text-sm text-on-surface-variant"
    >
      Memuat kode referal…
    </p>

    <p
      v-else-if="!data?.referrals.length"
      class="mt-6 rounded-xl border border-dashed border-outline-variant px-4 py-10 text-center text-sm text-on-surface-variant"
    >
      Belum ada kode referal yang cocok dengan filter ini.
    </p>

    <div
      v-else
      class="mt-6 space-y-4"
    >
      <ReferralCard
        v-for="referral in data.referrals"
        :key="referral.id"
        :referral="referral"
        @updated="replaceReferral"
        @removed="removeReferral"
      />
    </div>

    <nav
      v-if="totalPages > 1"
      class="mt-6 flex items-center justify-between text-sm"
    >
      <button
        type="button"
        class="rounded-md border border-outline-variant px-3 py-1.5 disabled:opacity-40"
        :disabled="page <= 1"
        @click="applyQuery({ page: page - 1 })"
      >
        Sebelumnya
      </button>

      <span class="text-on-surface-variant">Halaman {{ page }} dari {{ totalPages }}</span>

      <button
        type="button"
        class="rounded-md border border-outline-variant px-3 py-1.5 disabled:opacity-40"
        :disabled="page >= totalPages"
        @click="applyQuery({ page: page + 1 })"
      >
        Berikutnya
      </button>
    </nav>
  </div>
</template>
