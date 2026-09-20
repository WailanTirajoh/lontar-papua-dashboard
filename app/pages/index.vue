<script setup lang="ts">
/**
 * Daftar pesanan - satu-satunya halaman kerja dashboard.
 *
 * Seluruh filter tinggal di query string, bukan di state komponen: admin
 * dapur sering mengirim tautan "pesanan besok yang masih baru" ke sesama
 * admin, dan tautan itu hanya berarti bila filternya ikut terbawa. Pengaruh
 * sampingannya, tombol back peramban bekerja seperti yang diharapkan.
 */

const route = useRoute()
const router = useRouter()

/** Filter yang sedang aktif, dibaca dari URL - bukan disalin ke state. */
const activeStatus = computed(() => String(route.query.status ?? ''))
const page = computed(() => Number(route.query.page) || 1)

/**
 * Cookie sesi diteruskan eksplisit: saat render di server, $fetch internal
 * memanggil /api/orders tanpa membawa cookie peramban, sehingga
 * requireAdmin() akan melihatnya sebagai tamu dan membalas 401.
 */
const headers = useRequestHeaders(['cookie'])

const listQuery = computed(() => ({
  status: route.query.status || undefined,
  q: route.query.q || undefined,
  from: route.query.from || undefined,
  to: route.query.to || undefined,
  page: page.value
}))

const { data, status: fetchStatus, error, refresh } = await useFetch('/api/orders', {
  query: listQuery,
  headers
})

const { data: summary } = await useFetch('/api/summary', { headers })

/** Isian formulir filter; baru berpengaruh setelah "Terapkan" ditekan. */
const form = reactive({
  q: String(route.query.q ?? ''),
  from: String(route.query.from ?? ''),
  to: String(route.query.to ?? '')
})

/**
 * Menyusun query baru dari yang sekarang. Nilai kosong dibuang supaya URL
 * tidak menumpuk parameter kosong, dan `page` selalu kembali ke 1 - halaman
 * 7 dari filter lama hampir pasti kosong di filter baru.
 */
function applyQuery(patch: Record<string, string | number | undefined>) {
  const next: Record<string, string> = {}

  for (const [key, value] of Object.entries({ ...route.query, ...patch })) {
    const text = String(value ?? '').trim()
    if (text) next[key] = text
  }

  if (!('page' in patch)) delete next.page

  router.push({ query: next })
}

function applyFilters() {
  applyQuery({ q: form.q, from: form.from, to: form.to })
}

function resetFilters() {
  form.q = ''
  form.from = ''
  form.to = ''
  router.push({ query: {} })
}

/**
 * Kartu yang statusnya baru saja diubah ditukar di tempat, bukan memuat
 * ulang seluruh daftar: admin sering mengubah beberapa pesanan berturut-
 * turut, dan daftar yang melompat ke atas tiap kali membuat urutan kerja
 * mudah hilang.
 *
 * Baris pesanan dan angka ringkasan sama-sama datang dari balasan PATCH,
 * jadi keduanya hasil hitungan server sesudah perubahan tersimpan. Menggeser
 * sendiri angkanya di sini - satu turun, satu naik - sempat dicoba dan
 * salah: tebakan itu hanya benar bila admin ini satu-satunya yang menyentuh
 * tabel sejak ringkasan dimuat, padahal NUXT_ADMIN_EMAILS menerima lebih
 * dari satu orang. Tetap satu perjalanan jaringan, kini dengan angka yang
 * benar-benar dihitung.
 */
function replaceOrder({ order: updated, summary: fresh }: OrderPatchResult) {
  if (data.value) {
    data.value = {
      ...data.value,
      orders: data.value.orders.map((order) => order.id === updated.id ? updated : order)
    }
  }

  // `null` berarti statusnya tersimpan tapi ringkasannya gagal dihitung.
  // Angka lama dibiarkan berdiri: salah satu angka meleset lebih baik
  // daripada seluruh deretan kartu mendadak kosong.
  if (fresh) summary.value = fresh
}

/**
 * Angka "Semua" dijumlahkan dari ringkasan per status, bukan dari `total`
 * daftar: `total` sudah ikut tersaring filter yang aktif, sehingga tombol
 * untuk melepas filter justru akan menampilkan angka hasil filter itu.
 */
const totalSemua = computed(() =>
  Object.values(summary.value ?? {}).reduce((sum, count) => sum + count, 0)
)

const totalPages = computed(() => {
  if (!data.value?.total) return 1
  return Math.ceil(data.value.total / data.value.pageSize)
})

/** 403 berarti akunnya sah tapi bukan admin - saran perbaikannya berbeda. */
const forbidden = computed(() => error.value?.statusCode === 403)
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-semibold text-espresso">
      Pesanan
    </h1>

    <!-- Ringkasan sekaligus pemilih status: angkanya dihitung dari seluruh
         tabel, jadi tetap benar di halaman berapa pun. -->
    <nav class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
      <button
        type="button"
        class="rounded-lg border px-3 py-2 text-left transition-colors"
        :class="activeStatus === ''
          ? 'border-primary bg-primary-container/30'
          : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container'"
        @click="applyQuery({ status: undefined })"
      >
        <span class="block text-xs text-on-surface-variant">Semua</span>
        <span class="block text-lg font-semibold tabular-nums text-on-surface">
          {{ totalSemua }}
        </span>
      </button>

      <button
        v-for="option in orderStatuses"
        :key="option.value"
        type="button"
        class="rounded-lg border px-3 py-2 text-left transition-colors"
        :class="activeStatus === option.value
          ? 'border-primary bg-primary-container/30'
          : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container'"
        @click="applyQuery({ status: option.value })"
      >
        <span class="block text-xs text-on-surface-variant">{{ option.label }}</span>
        <span class="block text-lg font-semibold tabular-nums text-on-surface">
          {{ summary?.[option.value] ?? 0 }}
        </span>
      </button>
    </nav>

    <form
      class="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
      @submit.prevent="applyFilters"
    >
      <label class="min-w-48 flex-1">
        <span class="mb-1 block text-xs font-medium text-on-surface-variant">Nama atau nomor</span>
        <input
          v-model="form.q"
          type="search"
          placeholder="Cari pembeli…"
          class="w-full rounded-md border border-outline-variant px-3 py-2 text-sm"
        >
      </label>

      <label>
        <span class="mb-1 block text-xs font-medium text-on-surface-variant">Kirim dari</span>
        <input
          v-model="form.from"
          type="date"
          class="rounded-md border border-outline-variant px-3 py-2 text-sm"
        >
      </label>

      <label>
        <span class="mb-1 block text-xs font-medium text-on-surface-variant">sampai</span>
        <input
          v-model="form.to"
          type="date"
          class="rounded-md border border-outline-variant px-3 py-2 text-sm"
        >
      </label>

      <button
        type="submit"
        class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
      >
        Terapkan
      </button>

      <button
        type="button"
        class="rounded-md border border-outline-variant px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container"
        @click="resetFilters"
      >
        Reset
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
      <p>Pesanan gagal dimuat.</p>
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
      Memuat pesanan…
    </p>

    <p
      v-else-if="!data?.orders.length"
      class="mt-6 rounded-xl border border-dashed border-outline-variant px-4 py-10 text-center text-sm text-on-surface-variant"
    >
      Belum ada pesanan yang cocok dengan filter ini.
    </p>

    <div
      v-else
      class="mt-6 space-y-4"
    >
      <OrderCard
        v-for="order in data.orders"
        :key="order.id"
        :order="order"
        @updated="replaceOrder"
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
