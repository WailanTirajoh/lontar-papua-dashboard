<script setup lang="ts">
const props = defineProps<{ order: Order }>()
const emit = defineEmits<{ updated: [order: Order] }>()

const saving = ref(false)
const errorMessage = ref('')

const phoneLink = computed(() => waLink(props.order.customer_phone))

/**
 * Status diubah langsung dari kartu, tanpa halaman detail: satu-satunya
 * pekerjaan admin di sini memang memindahkan pesanan antar kolom dapur.
 *
 * Baris hasil dari server yang dipakai, bukan nilai pilihan di layar -
 * dengan begitu kartu tidak bisa menampilkan status yang ternyata gagal
 * tersimpan.
 */
async function changeStatus(event: Event) {
  const status = (event.target as HTMLSelectElement).value as OrderStatus
  if (status === props.order.status || saving.value) return

  saving.value = true
  errorMessage.value = ''

  try {
    const updated = await $fetch<Order>(`/api/orders/${props.order.id}`, {
      method: 'PATCH',
      body: { status }
    })
    emit('updated', updated)
  } catch {
    errorMessage.value = 'Status gagal disimpan.'
    // Kembalikan select ke nilai yang benar-benar tersimpan.
    ;(event.target as HTMLSelectElement).value = props.order.status
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <article class="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-warm">
    <header class="flex flex-wrap items-start gap-x-3 gap-y-1">
      <h2 class="font-display text-lg font-semibold text-espresso">
        {{ order.customer_name }}
      </h2>
      <OrderStatusBadge :status="order.status" />
      <span class="ml-auto text-xs text-on-surface-variant">
        #{{ order.id }} · {{ formatWaktu(order.created_at) }}
      </span>
    </header>

    <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div>
        <dt class="text-xs uppercase tracking-wide text-on-surface-variant">
          Kirim
        </dt>
        <dd class="text-on-surface">
          {{ formatTanggal(order.delivery_date) }} · {{ order.courier }}
        </dd>
      </div>

      <div>
        <dt class="text-xs uppercase tracking-wide text-on-surface-variant">
          Kontak
        </dt>
        <dd class="text-on-surface">
          <a
            v-if="phoneLink"
            :href="phoneLink"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 text-wa hover:underline"
          >
            <Icon name="material-symbols:chat-outline" />
            {{ order.customer_phone }}
          </a>
          <span
            v-else
            class="text-on-surface-variant"
          >Tidak diisi</span>
        </dd>
      </div>

      <div
        v-if="!order.is_pickup && order.address"
        class="sm:col-span-2"
      >
        <dt class="text-xs uppercase tracking-wide text-on-surface-variant">
          Alamat
        </dt>
        <dd class="whitespace-pre-line text-on-surface">
          {{ order.address }}
        </dd>
      </div>

      <div
        v-if="order.notes"
        class="sm:col-span-2"
      >
        <dt class="text-xs uppercase tracking-wide text-on-surface-variant">
          Catatan
        </dt>
        <dd class="whitespace-pre-line text-on-surface">
          {{ order.notes }}
        </dd>
      </div>

      <div v-if="order.referral_code">
        <dt class="text-xs uppercase tracking-wide text-on-surface-variant">
          Kode referal
        </dt>
        <dd class="text-on-surface">
          {{ order.referral_code }}
          <!-- Hasil pengecekan ulang di server situs pembeli. Kode yang tidak
               terverifikasi tetap disimpan, jadi bedanya harus kelihatan. -->
          <span
            v-if="!order.referral_verified"
            class="text-error"
          >(tidak terverifikasi)</span>
        </dd>
      </div>
    </dl>

    <ul class="mt-4 divide-y divide-outline-variant border-y border-outline-variant text-sm">
      <li
        v-for="item in order.order_items"
        :key="item.id"
        class="flex items-baseline gap-2 py-2"
      >
        <span class="text-on-surface">
          {{ item.product_name }}
          <span class="text-on-surface-variant">
            · {{ item.slice_count ? `${item.slice_count} slice` : `${item.qty} ${item.unit}` }}
          </span>
          <span
            v-if="item.with_hampers"
            class="text-on-surface-variant"
          >· hampers</span>
          <!-- Rasa paket dapat barisnya sendiri: ini yang dibaca dapur saat
               menyiapkan pesanan, bukan sekadar keterangan tambahan. -->
          <span
            v-if="item.flavors?.length"
            class="mt-0.5 block text-on-surface-variant"
          >{{ item.flavors.join(' + ') }}</span>
        </span>
        <span class="ml-auto shrink-0 tabular-nums text-on-surface">
          {{ formatRupiah(item.line_total_idr) }}
        </span>
      </li>
    </ul>

    <footer class="mt-3 flex flex-wrap items-center gap-3">
      <div class="text-sm">
        <span class="text-on-surface-variant">Total</span>
        <strong class="ml-2 tabular-nums text-on-surface">{{ formatRupiah(order.total_idr) }}</strong>
        <span
          v-if="order.addon_idr"
          class="ml-1 text-xs text-on-surface-variant"
        >(termasuk hampers {{ formatRupiah(order.addon_idr) }})</span>
      </div>

      <label class="ml-auto flex items-center gap-2 text-sm">
        <span class="sr-only">Ubah status pesanan {{ order.id }}</span>
        <select
          class="rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-sm text-on-surface disabled:opacity-60"
          :value="order.status"
          :disabled="saving"
          @change="changeStatus"
        >
          <option
            v-for="status in orderStatuses"
            :key="status.value"
            :value="status.value"
          >
            {{ status.label }}
          </option>
        </select>
      </label>
    </footer>

    <p
      v-if="errorMessage"
      class="mt-2 text-sm text-error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </article>
</template>
