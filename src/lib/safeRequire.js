/**
 * Memuat modul opsional tanpa membuat bundler gagal saat modulnya tidak ada.
 * Dipakai untuk modul native "bonus" (ML Kit / speech recognition) yang hanya
 * tersedia kalau project dijalankan sebagai dev build.
 */
export function safeRequire(name) {
  try {
    // eval membuat Metro tidak mencoba me-resolve modul ini saat bundling.
    // eslint-disable-next-line no-eval
    const req = typeof eval === 'function' ? eval('typeof require === "function" ? require : null') : null;
    return req ? req(name) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Versi yang AMAN untuk modul yang BENAR-BENAR terpasang di package.json
 * (mis. `expo-speech-recognition`).
 *
 * Bedanya dengan `safeRequire`: `require` di sini ditulis sebagai string
 * literal, jadi Metro ikut membundel modulnya (kalau pakai nama variabel,
 * Metro tidak tahu modul itu ada dan bundle-nya "Requiring unknown module").
 * Kalau modul native-nya tidak ada di runtime (Expo Go), pemuatan melempar
 * error yang ditangkap di sini → aplikasi tetap jalan dengan mode cadangan.
 */
export function safeLoad(loader) {
  try {
    return loader() || null;
  } catch (e) {
    return null;
  }
}

export function hasModule(name) {
  const m = safeRequire(name);
  return !!m;
}
