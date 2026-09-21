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

/**
 * `lazy` dan setup yang tidak lagi `await` - sama persis alasannya dengan
 * halaman pesanan: tanpa keduanya, Suspense menahan halaman lama sampai
 * /api/referrals membalas, sehingga klik menu terasa menggantung. Render di
 * server tidak terpengaruh, datanya tetap ditunggu di sana.
 */
const { data, status: fetchStatus, error, refresh } = useFetch('/api/referrals', {
  query: listQuery,
  headers,
  lazy: true
})

/**
 * 'idle' ikut dihitung sebagai sedang memuat: pengambilan lazy baru berjalan
 * di `onBeforeMount`, jadi tanpa itu sekejap pertama halaman akan mengaku
 * "belum ada kode referal".
 */
const loading = computed(() => fetchStatus.value === 'idle' || fetchStatus.value === 'pending')

/**
 * Kerangka hanya saat layar masih kosong; daftar lama dibiarkan berdiri
 * (diredupkan) selama data baru diambil. Lihat halaman pesanan untuk
 * alasannya.
 */
const showSkeleton = computed(() => loading.value && !data.value)
const refreshing = computed(() => loading.value && !!data.value)

/** Kira-kira setinggi satu layar, bukan pageSize - lihat halaman pesanan. */
const SKELETON_CARDS = 3

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

const canSave = computed(() => !saving.value && referralDraftReady(draft.value))

function openForm() {
  draft.value = emptyReferralDraft()
  formError.value = ''
  adding.value = true
}

/**
 * Daftar dimuat ulang dari server setelah kode baru tersimpan, bukan
 * disisipkan sendiri di atas.
 *
 * Menyisipkannya memang tidak membuat daftar melompat, tapi daftar ini
 * tersaring dan berhalaman: baris sisipan itu akan tetap terlihat meski tidak
 * cocok dengan filter yang sedang aktif, dan halamannya jadi lebih panjang
 * daripada pageSize. Urutannya `is_active desc, created_at desc`, jadi tanpa
 * filter kode baru tetap muncul paling atas - hasil yang sama, tanpa baris
 * yang membohongi filternya.
 */
async function create() {
  saving.value = true
  formError.value = ''

  try {
    await $fetch<Referral>('/api/referrals', {
      method: 'POST',
      body: draft.value
    })

    await refresh()
    adding.value = false
  } catch (err) {
    formError.value = errorText(err, 'Kode gagal disimpan.')
  } finally {
    saving.value = false
  }
}

/**
 * Kartu yang baru diubah ditukar di tempat, bukan memuat ulang daftar - pola
 * yang sama dengan replaceOrder() di halaman pesanan, dan alasannya sama:
 * admin sering mengubah beberapa baris berturut-turut, dan daftar yang
 * melompat tiap kali membuat urutan kerjanya hilang.
 *
 * Akibatnya kode yang baru dinonaktifkan tetap terlihat meski filternya
 * "Aktif". Itu disengaja: kartunya menampilkan baris yang benar-benar
 * tersimpan, dan menghilangkan baris yang baru saja disentuh admin justru
 * menyembunyikan hasil pekerjaannya sendiri. Filter dirapikan muat ulang
 * berikutnya.
 */
function replaceReferral(updated: Referral) {
  if (!data.value) return

  data.value = {
    ...data.value,
    referrals: data.value.referrals.map((r) => r.id === updated.id ? updated : r)
  }
}

/**
 * Setelah satu kode dihapus, daftar diambil ulang supaya barisnya terisi dari
 * halaman berikutnya dan totalnya benar.
 *
 * Kecuali satu hal yang tidak bisa diperbaiki oleh muat ulang: menghapus
 * baris terakhir di halaman kedua atau seterusnya meninggalkan halaman yang
 * memang sudah tidak ada, dan admin melihat "belum ada kode referal yang
 * cocok" padahal kodenya masih banyak. Karena itu halamannya dimundurkan
 * dulu - perpindahan rute itu sendiri yang memicu pengambilan ulang.
 */
async function removeReferral() {
  if (!data.value) return

  if (data.value.referrals.length <= 1 && page.value > 1) {
    const previous = page.value - 1
    applyQuery({ page: previous > 1 ? previous : undefined })
    return
  }

  await refresh()
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

    <div
      v-else-if="showSkeleton"
      class="mt-6 space-y-4"
      role="status"
      aria-busy="true"
    >
      <!-- Balok-baloknya tidak berarti apa-apa bagi pembaca layar, jadi
           kalimatnya tetap ada - hanya tidak tergambar. -->
      <span class="sr-only">Memuat kode referal…</span>
      <ReferralCardSkeleton
        v-for="n in SKELETON_CARDS"
        :key="n"
      />
    </div>

    <p
      v-else-if="!data?.referrals.length"
      class="mt-6 rounded-xl border border-dashed border-outline-variant px-4 py-10 text-center text-sm text-on-surface-variant"
    >
      Belum ada kode referal yang cocok dengan filter ini.
    </p>

    <!-- Daftar lama tetap terbaca saat data baru diambil, cuma diredupkan. -->
    <div
      v-else
      class="mt-6 space-y-4 transition-opacity"
      :class="refreshing && 'opacity-60'"
      :aria-busy="refreshing"
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
