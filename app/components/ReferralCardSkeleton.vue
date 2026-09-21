<script setup lang="ts">
/**
 * Bentuk kosong ReferralCard - alasan dan caranya sama dengan
 * OrderCardSkeleton: rangka luar disalin dari kartu aslinya supaya daftar
 * yang datang tidak menggeser apa pun.
 */
</script>

<template>
  <article
    class="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-warm"
    aria-hidden="true"
  >
    <header class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div class="skeleton h-6 w-32" />
      <div class="skeleton h-5 w-16 rounded-full" />
      <div class="skeleton ml-auto h-4 w-24" />
    </header>

    <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div
        v-for="field in 2"
        :key="field"
      >
        <dt class="skeleton h-3 w-16" />
        <dd class="skeleton mt-1.5 h-4 w-40" />
      </div>
    </dl>

    <footer class="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
      <div class="skeleton h-8 w-32 rounded-md" />
      <div class="skeleton h-8 w-24 rounded-md" />
      <div class="skeleton ml-auto h-8 w-24 rounded-md" />
    </footer>
  </article>
</template>
