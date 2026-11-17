import { Linking, Platform, PermissionsAndroid } from 'react-native';

/**
 * Suara → teks (STT) memakai mesin pengenal suara milik sistem operasi.
 *
 * Android: layanan Google (`com.google.android.googlequicksearchbox`), yaitu
 * Google Speech Recognition — akurasi paling bagus untuk bahasa Indonesia.
 * Butuh internet, dan aplikasi Google harus terpasang di HP.
 * iOS: mesin bawaan Apple (SFSpeechRecognizer).
 * Web: Web Speech API (Chrome/Edge).
 *
 * Aplikasi tidak menyimpan rekaman apa pun; audio ditangani mesin di atas.
 */

export const SPEECH_LANG = 'id-ID';
export const SPEECH_LANG_LABEL = 'Bahasa Indonesia';

const START_OPTIONS = {
  lang: SPEECH_LANG,
  interimResults: true, // transkripsi real-time (kata per kata)
  continuous: true, // jangan berhenti sendiri setelah satu kalimat
  maxAlternatives: 1,
  addsPunctuation: false,
  requiresOnDeviceRecognition: false, // pakai mesin Google daring, bukan on-device
  volumeChangeEventOptions: { enabled: true, intervalMillis: 110 }, // animasi mic
  androidIntentOptions: {
    EXTRA_LANGUAGE_MODEL: 'free_form', // kalimat bebas, bukan perintah pendek
    EXTRA_PREFER_OFFLINE: false, // boleh dikirim ke server Google → lebih akurat
    EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
    EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
  },
};

/* ------------------------------------------------------------------ *
 * Pemuatan modul (opsional — tidak boleh mematikan bundling)
 * ------------------------------------------------------------------ */

let systemCached; // undefined = belum dicoba | null = tidak ada | object = modul
function loadSystem() {
  if (systemCached !== undefined) return systemCached;
  try {
    // require literal supaya Metro ikut membundel modulnya.
    systemCached = require('expo-speech-recognition') || null;
  } catch (e) {
    // Expo Go / build tanpa modul native: jatuh ke mode tulis manual.
    console.warn('[duitku/stt] modul STT tidak bisa dimuat:', (e && e.message) || e);
    systemCached = null;
  }
  return systemCached;
}

function systemModule() {
  const mod = loadSystem();
  if (!mod) return null;
  // Paket ini mengekspor objek native module sebagai `ExpoSpeechRecognitionModule`,
  // bukan fungsi `start` di root — salah baca di sini bikin sheet mengira Expo Go.
  const M = mod.ExpoSpeechRecognitionModule || mod.default || mod;
  return M && typeof M.start === 'function' ? M : null;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ------------------------------------------------------------------ *
 * Dukungan perangkat
 * ------------------------------------------------------------------ */

/**
 * @returns {{ok:boolean, kind:'native'|'web'|'none', lang:string, engine:string, reason?:string}}
 */
export function speechSupport() {
  if (Platform.OS === 'web') {
    const hasApi =
      typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!hasApi) return { ok: false, kind: 'none', lang: SPEECH_LANG, engine: '', reason: 'browser' };
    return { ok: true, kind: 'web', lang: SPEECH_LANG, engine: 'browser' };
  }

  const M = systemModule();
  if (!M) {
    return { ok: false, kind: 'none', lang: SPEECH_LANG, engine: '', reason: 'expogo' };
  }

  if (Platform.OS === 'android') {
    // Pastikan ada layanan pengenal suara (biasanya aplikasi Google).
    let available = true;
    try {
      if (typeof M.isRecognitionAvailable === 'function') available = !!M.isRecognitionAvailable();
    } catch (e) {
      available = true;
    }
    if (!available) {
      return { ok: false, kind: 'none', lang: SPEECH_LANG, engine: '', reason: 'service' };
    }
    return { ok: true, kind: 'native', lang: SPEECH_LANG, engine: assistantEngineName(M) };
  }

  return { ok: true, kind: 'native', lang: SPEECH_LANG, engine: 'Apple' };
}

/** Nama pendek layanan STT Android yang akan dipakai (Google / Bixby / lain). */
function assistantEngineName(M) {
  let pkg = '';
  try {
    const s = typeof M.getAssistantService === 'function' ? M.getAssistantService() : null;
    pkg = (s && s.packageName) || '';
  } catch (e) {
    pkg = '';
  }
  if (pkg === 'com.google.android.googlequicksearchbox') return 'Google';
  if (pkg === 'com.google.android.as') return 'Android System Intelligence';
  if (/bixby|samsung/i.test(pkg)) return 'Samsung';
  if (pkg) return pkg.split('.').slice(-1)[0];
  return 'sistem';
}

/** Mode ringkas untuk teks bantuan. */
export function speechMode() {
  const s = speechSupport();
  if (!s.ok) return 'none';
  return s.kind === 'web' ? 'browser' : 'native';
}

export function speechHint() {
  const s = speechSupport();
  if (s.kind === 'native') {
    return `Bicara langsung di aplikasi — ${SPEECH_LANG_LABEL}, diproses mesin ${s.engine} (butuh internet). Hasilnya muncul sambil kamu bicara.`;
  }
  if (s.kind === 'web') {
    return `Bicara langsung di browser — ${SPEECH_LANG_LABEL} (${SPEECH_LANG}). Hasilnya muncul sambil kamu bicara.`;
  }
  if (s.reason === 'browser') {
    return 'Browser ini belum mendukung dikte. Pakai Chrome/Edge terbaru, atau tulis langsung di bawah.';
  }
  if (s.reason === 'service') {
    return 'Layanan pengenalan suara belum aktif di HP ini. Pasang/aktifkan aplikasi Google, lalu buka lagi Duitku. Sementara itu tulis langsung di bawah.';
  }
  return 'Dikte butuh dev build (modul STT native tidak ada di Expo Go). Sementara itu, tulis langsung di bawah.';
}

/* ------------------------------------------------------------------ *
 * Izin mikrofon
 * ------------------------------------------------------------------ */

/**
 * Minta izin mikrofon (Android: RECORD_AUDIO, iOS: mikrofon + pengenalan suara).
 * Di web selalu "granted" — browser menanyakan sendiri saat rekaman dimulai.
 */
export async function requestMicPermission() {
  const M = systemModule();
  if (M && typeof M.getPermissionsAsync === 'function') {
    try {
      const cur = await M.getPermissionsAsync();
      if (cur && cur.granted) return { granted: true, status: cur.status || 'granted', canAskAgain: true };
      if (cur && cur.canAskAgain === false) {
        return { granted: false, status: cur.status || 'denied', canAskAgain: false };
      }
      const res = await M.requestPermissionsAsync();
      return {
        granted: !!(res && res.granted),
        status: (res && res.status) || 'denied',
        canAskAgain: !(res && res.canAskAgain === false),
      };
    } catch (e) {
      // lanjut ke cara bawaan di bawah
    }
  }

  if (Platform.OS === 'android' && PermissionsAndroid) {
    try {
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (granted) return { granted: true, status: 'granted', canAskAgain: true };
      const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return {
        granted: res === PermissionsAndroid.RESULTS.GRANTED,
        status: res,
        canAskAgain: res !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      };
    } catch (e) {
      return { granted: false, reason: 'error', message: String((e && e.message) || e), canAskAgain: true };
    }
  }

  // iOS: dialog izin mikrofon muncul otomatis saat audio session dimulai.
  if (Platform.OS === 'ios') return { granted: true, status: 'undetermined', canAskAgain: true };

  return { granted: false, reason: 'unavailable', canAskAgain: false };
}

/** Buka pengaturan aplikasi (dipakai saat izin diblokir permanen). */
export function openAppSettings() {
  try {
    if (typeof Linking.openSettings === 'function') return Linking.openSettings();
    return null;
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Mesin pengenal suara sistem
 * ------------------------------------------------------------------ */

function startEngine(handlers = {}) {
  const M = systemModule();
  if (!M) {
    handlers.onError &&
      handlers.onError({ code: 'unavailable', message: 'Mesin pengenal suara tidak tersedia di build ini.' });
    return null;
  }

  const subs = [];
  let finished = false;
  let manual = false;
  let started = false;

  const cleanup = () => {
    while (subs.length) {
      const sub = subs.pop();
      try {
        if (sub && typeof sub.remove === 'function') sub.remove();
      } catch (e) {
        /* diabaikan */
      }
    }
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    cleanup();
    handlers.onEnd && handlers.onEnd({ manual });
  };

  const listen = (event, fn) => {
    try {
      const sub = M.addListener(event, fn);
      if (sub) subs.push(sub);
    } catch (e) {
      /* event tidak didukung di platform ini */
    }
  };

  listen('start', () => {
    started = true;
    handlers.onStart && handlers.onStart();
  });

  listen('result', (e) => {
    const first = e && e.results && e.results[0];
    const text = first && typeof first.transcript === 'string' ? first.transcript : '';
    if (e && e.isFinal) handlers.onFinal && handlers.onFinal(text);
    else handlers.onPartial && handlers.onPartial(text);
  });

  listen('volumechange', (e) => {
    // Android: -2..10 (di bawah 0 = tidak terdengar) — iOS: 0..1
    const raw = Number(e && e.value);
    if (!isFinite(raw)) return;
    const level = raw <= 1 && raw >= 0 ? raw : clamp01((raw + 2) / 12);
    handlers.onVolume && handlers.onVolume(level);
  });

  listen('error', (e) => {
    const code = (e && e.error) || 'error';
    if (code === 'aborted') return; // dibatalkan sendiri, bukan masalah
    handlers.onError &&
      handlers.onError({
        code,
        message: (e && e.message) || 'Mikrofon tidak bisa dipakai.',
      });
  });

  listen('end', () => finish());

  try {
    M.start(START_OPTIONS);
  } catch (e) {
    cleanup();
    handlers.onError && handlers.onError({ code: 'start-failed', message: String((e && e.message) || e) });
    return null;
  }

  return {
    stop() {
      manual = true;
      try {
        M.stop(); // minta hasil final dulu
      } catch (e) {
        finish();
      }
      // jaring pengaman kalau event "end" tidak pernah datang
      setTimeout(finish, 1400);
    },
    abort() {
      manual = true;
      try {
        M.abort();
      } catch (e) {
        /* diabaikan */
      }
      finish();
    },
    get started() {
      return started;
    },
  };
}

/* ------------------------------------------------------------------ *
 * API publik
 * ------------------------------------------------------------------ */

/**
 * Mulai mendengarkan (mesin Google / sistem).
 *
 * handlers:
 *   onStart()                    — mesin mulai merekam
 *   onPartial(text)              — transkripsi sementara (real-time)
 *   onFinal(text)                — hasil akhir sesi
 *   onVolume(level 0..1)         — level suara untuk animasi
 *   onError({ code, message })   — error (izin, layanan, jaringan, dsb.)
 *   onEnd({ manual })            — sesi berhenti
 *
 * @returns {{stop:Function, abort:Function, started:boolean}|null}
 */
export function startListening(handlers = {}) {
  const support = speechSupport();
  if (!support.ok) {
    handlers.onError &&
      handlers.onError({
        code: 'unavailable',
        message:
          support.reason === 'expogo'
            ? 'Dikte butuh dev build (Expo Go tidak punya modul STT).'
            : support.reason === 'service'
              ? 'Layanan pengenalan suara belum aktif di perangkat ini.'
              : 'Mesin pengenal suara tidak tersedia di perangkat ini.',
      });
    return null;
  }
  return startEngine(handlers);
}
