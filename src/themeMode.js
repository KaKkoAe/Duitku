import { useCallback, useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyMode } from './theme';

/**
 * Mode tampilan (terang/gelap).
 *
 * Sengaja dipisah dari `src/store.js`: preferensi tampilan disimpan di kunci
 * AsyncStorage sendiri (`duitku/theme`), jadi logika data keuangan
 * (`duitku/v1`) tidak tersentuh sama sekali.
 *
 * Alur:
 * 1. `initTheme(scheme)` dipanggil sekali saat app start → baca preferensi
 *    tersimpan; kalau belum ada, ikut tema sistem (useColorScheme).
 * 2. `setMode()` mengganti palet di `theme.js` lalu memberi tahu pelanggan.
 * 3. `useThemeMode()` (useSyncExternalStore) memicu re-render komponen —
 *    karena semua style inline, warna langsung ikut berganti.
 */

const KEY = 'duitku/theme';

let mode = 'light';
let hydrated = false;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      // jangan sampai satu listener rusak memblokir yang lain
    }
  });
}

export function getMode() {
  return mode;
}

export function isHydrated() {
  return hydrated;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Ganti mode. `persist: false` dipakai saat inisialisasi awal. */
export function setMode(next, { persist = true } = {}) {
  const target = next === 'dark' ? 'dark' : 'light';
  applyMode(target);
  if (target === mode) return target;
  mode = target;
  emit();
  if (persist) {
    AsyncStorage.setItem(KEY, mode).catch(() => {});
  }
  return mode;
}

export function toggleMode() {
  return setMode(mode === 'dark' ? 'light' : 'dark');
}

/**
 * Baca preferensi tersimpan; kalau tidak ada, ikuti tema sistem.
 * @param {'light'|'dark'|null|undefined} systemScheme hasil useColorScheme()
 */
export async function initTheme(systemScheme) {
  let saved = null;
  try {
    saved = await AsyncStorage.getItem(KEY);
  } catch (e) {
    saved = null;
  }
  const initial = saved === 'dark' || saved === 'light' ? saved : systemScheme === 'dark' ? 'dark' : 'light';
  applyMode(initial);
  hydrated = true;
  if (initial !== mode) {
    mode = initial;
  }
  emit();
  return mode;
}

/** Hook: mode aktif + aksi ganti mode. */
export function useThemeMode() {
  const modeNow = useSyncExternalStore(subscribe, getMode, getMode);
  const toggle = useCallback(() => toggleMode(), []);
  return { mode: modeNow, isDark: modeNow === 'dark', toggle, setMode };
}

/** Hook ringkas kalau hanya butuh boolean. */
export function useIsDark() {
  return useSyncExternalStore(subscribe, getMode, getMode) === 'dark';
}
