<script setup lang="ts">
/**
 * Halaman pendaratan setelah login lewat tautan email (reset kata sandi,
 * undangan akun baru). Alur kata sandi biasa tidak melewatinya, tapi
 * `redirectOptions.callback` di nuxt.config menunjuk ke sini dan tautan
 * undangan Supabase juga - tanpa halaman ini, keduanya mendarat di 404.
 */
definePageMeta({ layout: 'auth' })

const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()

watch(user, () => {
  if (user.value) navigateTo(redirectInfo.pluck() || '/')
}, { immediate: true })
</script>

<template>
  <p class="text-sm text-on-surface-variant">
    Menyiapkan sesi…
  </p>
</template>
