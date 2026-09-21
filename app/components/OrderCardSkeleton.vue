<script setup lang="ts">
/**
 * Bentuk kosong OrderCard, dipakai selama daftar pesanan masih diambil.
 *
 * Rangka luarnya - border, padding, jarak antar bagian - disalin persis dari
 * OrderCard, dan tiap balok mengisi tinggi baris yang akan menggantikannya.
 * Tingginya tidak mungkin sama persis (alamat dan catatan tidak selalu ada,
 * jumlah rincian berbeda-beda), tapi cukup dekat sehingga isi yang datang
 * tidak menyentak layar.
 */
</script>

<template>
  <article
    class="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-warm"
    aria-hidden="true"
  >
    <header class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div class="skeleton h-6 w-40" />
      <div class="skeleton h-5 w-20 rounded-full" />
      <div class="skeleton ml-auto h-4 w-32" />
    </header>

    <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div
        v-for="field in 2"
        :key="field"
      >
        <dt class="skeleton h-3 w-14" />
        <dd class="skeleton mt-1.5 h-4 w-44" />
      </div>
    </dl>

    <ul class="mt-4 divide-y divide-outline-variant border-y border-outline-variant">
      <li
        v-for="item in 2"
        :key="item"
        class="flex items-center gap-2 py-2.5"
      >
        <div class="skeleton h-4 w-52" />
        <div class="skeleton ml-auto h-4 w-24" />
      </li>
    </ul>

    <footer class="mt-3 flex flex-wrap items-center gap-3">
      <div class="skeleton h-5 w-40" />
      <div class="skeleton ml-auto h-9 w-36 rounded-md" />
    </footer>
  </article>
</template>
