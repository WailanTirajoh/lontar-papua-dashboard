/**
 * Pesan yang pantas ditampilkan dari kegagalan $fetch.
 *
 * Rute di server/api sengaja memberi statusMessage yang sudah berupa kalimat
 * Indonesia ("Kode itu sudah terdaftar"), karena hanya server yang tahu
 * bedanya kode duplikat dengan database yang sedang tidak bisa dihubungi.
 * Membuangnya lalu menampilkan "gagal menyimpan" untuk semua kasus membuat
 * admin menebak-nebak apa yang salah.
 *
 * Kegagalan jaringan tidak punya statusMessage; itulah gunanya `fallback`.
 */
export function errorText(error: unknown, fallback: string) {
  const message = (error as { statusMessage?: string })?.statusMessage
  return typeof message === 'string' && message ? message : fallback
}
