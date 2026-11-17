import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { safeRequire } from './safeRequire';

/**
 * OCR struk belanja — berlapis supaya tetap jalan di mana pun:
 *  1. "mlkit"   : @react-native-ml-kit/text-recognition (dev build, offline, paling cepat)
 *  2. "web"     : tesseract.js dari CDN (browser / expo web)
 *  3. "webview" : tesseract.js dijalankan di dalam WebView (Expo Go di HP, butuh internet)
 *  4. null      : tidak ada mesin OCR -> UI menawarkan isi manual / dikte
 */
export const TESS_JS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
export const TESS_CORE = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0';
export const TESS_WORKER = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js';
export const TESS_LANG = 'https://tessdata.projectnaptha.com/4.0.0';

const mlkit = () => safeRequire('@react-native-ml-kit/text-recognition');

export function ocrEngine() {
  if (mlkit()) return 'mlkit';
  if (Platform.OS === 'web') return 'web';
  return 'webview';
}

export const engineLabel = () => {
  const e = ocrEngine();
  if (e === 'mlkit') return 'ML Kit (offline)';
  if (e === 'web') return 'Tesseract (browser)';
  if (e === 'webview') return 'Tesseract (butuh internet)';
  return 'manual';
};

/** Kecilkan foto struk supaya OCR cepat & hemat memori. */
export async function prepareImage(uri, maxWidth = 1500) {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: maxWidth });
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    return { uri: saved.uri, base64: saved.base64 || '', width: saved.width, height: saved.height };
  } catch (e) {
    return { uri, base64: '', width: 0, height: 0 };
  }
}

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('bukan browser'));
      return;
    }
    if (window.Tesseract) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-tesseract]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('gagal memuat OCR')));
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.dataset.tesseract = '1';
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Gagal memuat mesin OCR. Periksa koneksi internet.'));
    document.head.appendChild(el);
  });

/** OCR di browser (expo web / Android Chrome). */
export async function recognizeOnWeb(image, onProgress) {
  await loadScript(TESS_JS);
  const T = window.Tesseract;
  if (!T) throw new Error('Mesin OCR tidak tersedia.');
  const target = image.base64 ? 'data:image/jpeg;base64,' + image.base64 : image.uri;
  const res = await T.recognize(target, 'ind+eng', {
    workerPath: TESS_WORKER,
    corePath: TESS_CORE,
    langPath: TESS_LANG,
    logger: (m) => {
      if (onProgress && m && m.status) onProgress(m.status, m.progress || 0);
    },
  });
  return (res && res.data && res.data.text) || '';
}

/** OCR dengan ML Kit (kalau project memakai dev build). */
export async function recognizeWithMlKit(uri) {
  const mod = mlkit();
  const impl = mod && (mod.default || mod);
  if (!impl || !impl.recognize) throw new Error('ML Kit tidak tersedia');
  const res = await impl.recognize(uri);
  return (res && res.text) || '';
}

export const ocrStatusLabel = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('loading tesseract')) return 'Memuat mesin OCR…';
  if (s.includes('loading language')) return 'Memuat bahasa Indonesia…';
  if (s.includes('initializing')) return 'Menyiapkan…';
  if (s.includes('recognizing')) return 'Membaca struk…';
  if (s.includes('loading script')) return 'Memuat…';
  if (s.includes('recognized')) return 'Selesai';
  return 'Memproses…';
};
