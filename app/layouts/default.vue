<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const navLinks = [
  { to: '/', label: 'Pesanan' },
  { to: '/referal', label: 'Referal' }
]

const signingOut = ref(false)

/**
 * Halaman tidak dipindah sendiri setelah logout: begitu sesi hilang,
 * middleware global @nuxtjs/supabase yang melempar ke /login. `reloadNuxtApp`
 * dipakai supaya seluruh state hasil useFetch ikut dibuang - kalau tidak,
 * daftar pesanan admin sebelumnya masih tergambar di layar sampai halaman
 * berikutnya selesai dimuat.
 */
async function signOut() {
  signingOut.value = true
  await supabase.auth.signOut()
  await reloadNuxtApp({ path: '/login', persistState: false })
}
</script>

<template>
  <div class="min-h-dvh bg-surface">
    <header class="sticky top-0 z-10 border-b border-outline-variant bg-surface-container-lowest/90 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <NuxtLink
          to="/"
          class="flex items-center gap-2 font-display text-lg font-semibold text-espresso"
        >
          <Icon
            name="material-symbols:bakery-dining-outline"
            class="text-xl text-primary"
          />
          Lontar Papua
        </NuxtLink>

        <!-- Dua halaman kerja saja; begitu bertambah, ini yang jadi menu. -->
        <nav class="flex items-center gap-1 text-sm">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="rounded-md px-2.5 py-1.5 text-on-surface-variant transition-colors hover:bg-surface-container"
            active-class="bg-primary-container/40 text-on-primary-container"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <span class="ml-auto hidden text-sm text-on-surface-variant sm:inline">
          {{ user?.email }}
        </span>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
          :disabled="signingOut"
          @click="signOut"
        >
          <Icon name="material-symbols:logout" />
          Keluar
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
