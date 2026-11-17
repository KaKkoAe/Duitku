import { Platform } from 'react-native';
import { safeRequire } from './safeRequire';

/**
 * Menyimpan foto struk ke folder permanen aplikasi supaya tidak hilang saat
 * cache ImagePicker dibersihkan. Kalau modul file system tidak tersedia
 * (mis. web), uri asli dikembalikan apa adanya.
 */
const legacyFS = () => safeRequire('expo-file-system/legacy');
const modernFS = () => safeRequire('expo-file-system');

const RECEIPT_DIR = 'struk';

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    '-' +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

export async function ensureReceiptDir() {
  const fs = legacyFS();
  if (fs && fs.documentDirectory) {
    const dir = fs.documentDirectory + RECEIPT_DIR + '/';
    try {
      const info = await fs.getInfoAsync(dir);
      if (!info.exists) await fs.makeDirectoryAsync(dir, { intermediates: true });
      return dir;
    } catch (e) {
      return null;
    }
  }
  const m = modernFS();
  if (m && m.Paths && m.Directory) {
    try {
      const dir = new m.Directory(m.Paths.document, RECEIPT_DIR);
      if (!dir.exists) dir.create({ intermediates: true });
      return dir.uri.endsWith('/') ? dir.uri : dir.uri + '/';
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function saveReceiptPhoto(uri, base64) {
  if (!uri) return null;

  if (Platform.OS === 'web') {
    if (uri.startsWith('data:') || uri.startsWith('blob:')) return uri;
    // base64 besar jangan disimpan ke state — cukup uri aslinya
    if (base64 && base64.length < 400000) return 'data:image/jpeg;base64,' + base64;
    return uri;
  }

  try {
    const dir = await ensureReceiptDir();
    if (!dir) return uri;
    const name = 'struk-' + stamp() + '.jpg';
    const dest = dir + name;

    const fs = legacyFS();
    if (fs && fs.copyAsync) {
      await fs.copyAsync({ from: uri, to: dest });
      return dest;
    }

    const m = modernFS();
    if (m && m.File) {
      const target = new m.File(dir, name);
      if (base64) {
        target.create({ overwrite: true });
        target.write(base64, { encoding: 'base64' });
        return target.uri;
      }
      const src = new m.File(uri);
      src.copy(target);
      return target.uri;
    }
  } catch (e) {
    // gagal menyalin: pakai uri sementara dari ImagePicker
  }
  return uri;
}

export async function deleteReceiptPhoto(uri) {
  if (!uri || Platform.OS === 'web') return false;
  try {
    const fs = legacyFS();
    if (fs && fs.deleteAsync) {
      await fs.deleteAsync(uri, { idempotent: true });
      return true;
    }
    const m = modernFS();
    if (m && m.File) {
      const f = new m.File(uri);
      if (f.exists) f.delete();
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}
