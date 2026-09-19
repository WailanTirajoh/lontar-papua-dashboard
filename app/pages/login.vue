<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()

const email = ref('')
const password = ref('')
const pending = ref(false)
const errorMessage = ref('')

/**
 * Masuk dengan kata sandi, bukan magic link.
 *
 * Magic link menggantungkan login harian dapur pada pengiriman email - SMTP
 * bawaan Supabase dibatasi beberapa pesan per jam dan sering mendarat di
 * spam. Akunnya toh cuma segelintir dan dibuat sekali dari dashboard
 * Supabase (lihat README).
 */
async function signIn() {
  if (pending.value) return

  pending.value = true
  errorMessage.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value
  })

  if (error) {
    // Pesan Supabase berbahasa Inggris dan menyebut "Invalid login
    // credentials" untuk email salah maupun sandi salah - memang disengaja
    // supaya tidak bisa dipakai menebak email mana yang terdaftar. Kalimat
    // di bawah menjaga sifat itu sambil tetap terbaca.
    errorMessage.value = error.message === 'Invalid login credentials'
      ? 'Email atau kata sandi salah.'
      : error.message
    pending.value = false
    return
  }

  // Sesi sudah tersimpan di cookie; kembalikan admin ke halaman yang tadi
  // dibuka sebelum dilempar ke sini.
  await navigateTo(redirectInfo.pluck() || '/')
}

/**
 * Sesi yang masih hidup (tab lain, atau kembali dari bookmark) tidak perlu
 * melihat formulir sama sekali.
 */
watch(user, () => {
  if (user.value) navigateTo(redirectInfo.pluck() || '/')
}, { immediate: true })
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="mb-6 text-center">
      <Icon
        name="material-symbols:bakery-dining-outline"
        class="text-4xl text-primary"
      />
      <h1 class="mt-2 font-display text-2xl font-semibold text-espresso">
        Dashboard Lontar Papua
      </h1>
      <p class="mt-1 text-sm text-on-surface-variant">
        Masuk untuk melihat pesanan yang masuk.
      </p>
    </div>

    <form
      class="space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-warm"
      @submit.prevent="signIn"
    >
      <div>
        <label
          for="email"
          class="mb-1 block text-sm font-medium text-on-surface-variant"
        >Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
        >
      </div>

      <div>
        <label
          for="password"
          class="mb-1 block text-sm font-medium text-on-surface-variant"
        >Kata sandi</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
        >
      </div>

      <p
        v-if="errorMessage"
        class="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
        :disabled="pending"
      >
        {{ pending ? 'Memeriksa…' : 'Masuk' }}
      </button>
    </form>
  </div>
</template>
