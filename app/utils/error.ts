/**
 * Pesan yang pantas ditampilkan dari kegagalan $fetch.
 *
 * Rute di server/api sengaja memberi statusMessage yang sudah berupa kalimat
 * Indonesia ("Kode itu sudah terdaftar"), karena hanya server yang tahu
 * bedanya kode duplikat dengan database yang sedang tidak bisa dihubungi.
 * Membuangnya lalu menampilkan "gagal menyimpan" untuk semua kasus membuat
 * admin menebak-nebak apa yang salah.
 *
 * Badan JSON dibaca LEBIH DULU, bukan `error.statusMessage`. Yang terakhir
 * itu diisi ofetch dari `response.statusText` - dan HTTP/2 tidak punya reason
 * phrase sama sekali, jadi di Vercel nilainya selalu string kosong dan setiap
 * kegagalan tampil sebagai `fallback` yang generik. H3 mengirim pesan yang
 * sama di badan responsnya, dan di sanalah ia selamat.
 *
 * Kegagalan jaringan tidak punya keduanya; itulah gunanya `fallback`.
 */
interface KegagalanFetch {
  data?: { statusMessage?: string, message?: string }
  statusMessage?: string
}

export function errorText(error: unknown, fallback: string) {
  const { data, statusMessage } = (error ?? {}) as KegagalanFetch

  for (const pesan of [data?.statusMessage, statusMessage]) {
    if (typeof pesan === 'string' && pesan.trim()) return pesan
  }

  return fallback
}
