<script setup lang="ts">
const props = defineProps<{ status: OrderStatus }>()

/**
 * Warna diambil dari token merek, bukan palet hijau/kuning/merah generik.
 * `batal` memakai error container supaya satu-satunya status yang perlu
 * diwaspadai memang terlihat berbeda sekilas.
 */
const tone: Record<OrderStatus, string> = {
  baru: 'bg-primary-container text-on-primary-container',
  diproses: 'bg-tertiary-container text-on-tertiary-container',
  selesai: 'bg-secondary-container text-on-secondary-container',
  batal: 'bg-error-container text-on-error-container'
}

const label = computed(() => orderStatusLabel(props.status))
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
    :class="tone[status]"
  >
    {{ label }}
  </span>
</template>
