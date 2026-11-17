import { Platform, StatusBar } from 'react-native';

/**
 * Duitku — sistem desain "Pastel Play" (dua mode: terang & gelap)
 *
 * Ceria, cerah, modern: kanvas off-white hangat, tinta ungu tua yang lembut,
 * aksen pastel (lilac, mint, peach, sky, butter, rose), sudut membulat besar,
 * huruf bulat Plus Jakarta Sans. Nominal uang selalu tabular-nums.
 *
 * Cara kerja mode gelap TANPA mengubah satu pun call-site:
 * - `C`, `GRAD`, `GRAD_*`, `TINT`, `shadow`, `shadowSoft` adalah objek yang
 *   SAMA sepanjang hidup app; `applyMode()` hanya mengubah isinya di tempat.
 * - Karena semua style di proyek ini ditulis inline (tanpa StyleSheet.create),
 *   nilai `C.xxx` dibaca ulang setiap render → cukup memicu re-render
 *   (lihat `src/themeMode.js`) dan seluruh UI ikut berganti warna.
 */

// ── Palet terang ────────────────────────────────────────────────────────────
const LIGHT = {
  // kanvas
  bg: '#FFF7F1',
  bgAlt: '#F6F0FF',
  paper: '#FFFFFF',
  card: '#FFFFFF',

  // tinta
  ink: '#2A2440',
  ink2: '#3B3363',
  sub: '#6E6688',
  faint: '#7A7292',
  line: '#F1E9F8',
  lineSoft: '#F8F3FD',
  track: '#F1EAF8',
  onInk: '#FFFFFF',
  onInkDim: 'rgba(255,255,255,0.8)',
  inkPanel: '#2A2440',

  // pastel
  lilac: '#A78BFA',
  lilacSoft: '#EFE9FF',
  mint: '#5FD3A6',
  mintSoft: '#DEF9EE',
  peach: '#FFA981',
  peachSoft: '#FFEBE0',
  sky: '#5CBCF5',
  skySoft: '#E1F3FF',
  butter: '#FFC96B',
  butterSoft: '#FFF3D9',
  rose: '#FF8FB1',
  roseSoft: '#FFE6EE',
  grape: '#8B6BFF',
  grapeSoft: '#EDE7FF',

  // alias kompatibel (kode lama memakai nama ini)
  text: '#2A2440',
  primary: '#7A56EC',
  primaryDark: '#6845DC',
  primarySoft: '#EDE7FF',
  accent: '#6B4BE0',
  income: '#0FA97C',
  incomeSoft: '#DEF9EE',
  expense: '#FF6B5E',
  expenseSoft: '#FFE7E3',
  amber: '#E09A2D',
  amberSoft: '#FFF3D9',
  transfer: '#6F5BD6',
  danger: '#EF5A6F',
  scrim: 'rgba(42,36,64,0.35)',
  // tinta di atas latar pastel lembut (dipakai tombol aksi cepat & pill)
  inkLilac: '#5B45C9',
  inkPeach: '#C25E2B',
  inkMint: '#0A7F5C',
  inkSky: '#1673B0',
  inkButter: '#B67A14',
};

// ── Palet gelap ─────────────────────────────────────────────────────────────
// Plum malam yang hangat (bukan hitam pekat) supaya tetap "lucu", bukan kaku.
const DARK = {
  // kanvas
  bg: '#141020',
  bgAlt: '#1A1531',
  paper: '#1E1836',
  card: '#1E1836',

  // tinta
  ink: '#F4F0FF',
  ink2: '#DFD7FA',
  sub: '#BDB5D8',
  faint: '#948CB4',
  line: '#2E2749',
  lineSoft: '#251F3D',
  track: '#2A2444',
  onInk: '#FFFFFF',
  onInkDim: 'rgba(255,255,255,0.82)',
  inkPanel: '#251D42',

  // pastel (latar lembut jadi tint gelap, aksen jadi lebih terang)
  lilac: '#B49BFF',
  lilacSoft: '#221B3B',
  mint: '#5FD3A6',
  mintSoft: '#16332C',
  peach: '#FFA981',
  peachSoft: '#3B2620',
  sky: '#6CC6FA',
  skySoft: '#152D3F',
  butter: '#FFC96B',
  butterSoft: '#332A16',
  rose: '#FF8FB1',
  roseSoft: '#3B2030',
  grape: '#A98CFF',
  grapeSoft: '#271F47',

  // alias kompatibel
  text: '#F4F0FF',
  primary: '#7A56EC',
  primaryDark: '#6845DC',
  primarySoft: '#221B3B',
  accent: '#B49BFF',
  income: '#37D6A0',
  incomeSoft: '#12332A',
  expense: '#FF8A7D',
  expenseSoft: '#3B2320',
  amber: '#F0B44E',
  amberSoft: '#33290F',
  transfer: '#9B87F0',
  danger: '#FF7A8C',
  scrim: 'rgba(6,3,14,0.62)',
  inkLilac: '#B49BFF',
  inkPeach: '#FFA981',
  inkMint: '#5FD3A6',
  inkSky: '#6CC6FA',
  inkButter: '#FFC96B',
};

/** Objek warna global — dimutasi di tempat oleh `applyMode()`. */
export const C = { ...LIGHT };

/** Mode aktif: 'light' | 'dark' (live binding). */
export let MODE = 'light';

export const R = { xs: 10, sm: 14, md: 20, lg: 26, xl: 34, pill: 999 };

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 34 };

export const F = {
  // Plus Jakarta Sans — huruf bulat modern
  sans: 'PlusJakartaSans_400Regular',
  sansMed: 'PlusJakartaSans_500Medium',
  sansSemi: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
  sansBlack: 'PlusJakartaSans_800ExtraBold',
  display: 'PlusJakartaSans_800ExtraBold',
  displayBold: 'PlusJakartaSans_700Bold',
  // alias lama — nama dipertahankan agar layar lain tidak perlu diubah,
  // tetapi sekarang menunjuk ke huruf bulat (tidak ada serif lagi).
  serif: 'PlusJakartaSans_800ExtraBold',
  serifMed: 'PlusJakartaSans_700Bold',
  serifSemi: 'PlusJakartaSans_700Bold',
  serifBold: 'PlusJakartaSans_800ExtraBold',
  serifItalic: 'PlusJakartaSans_600SemiBold',
};

/** Nominal uang: lebar digit seragam supaya angka tidak "menari". */
export const TNUM = { fontVariant: ['tabular-nums'] };

const SHADOW_L = {
  shadowColor: '#6A4BC4',
  shadowOpacity: 0.12,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 10 },
  elevation: 7,
};

const SHADOW_D = {
  shadowColor: '#000000',
  shadowOpacity: 0.45,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 10 },
  elevation: 7,
};

const SHADOW_SOFT_L = {
  shadowColor: '#6A4BC4',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

const SHADOW_SOFT_D = {
  shadowColor: '#000000',
  shadowOpacity: 0.32,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

export const shadow = { ...SHADOW_L };
export const shadowSoft = { ...SHADOW_SOFT_L };

export const TOP_PAD =
  Platform.OS === 'ios' ? 56 : Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 26;

export const BOTTOM_PAD = Platform.OS === 'ios' ? 26 : 16;

/** Gradasi kartu Total Saldo. */
const GRAD_L = ['#8B6BFF', '#5CBCF5'];
const GRAD_D = ['#7B5AF0', '#3E8ED8'];
export const GRAD = [...GRAD_L];

/** Gradasi cadangan untuk aksen lain. */
const GRAD_WARM_L = ['#FF9E7D', '#FF8FB1'];
const GRAD_WARM_D = ['#E97B5F', '#E06A96'];
export const GRAD_WARM = [...GRAD_WARM_L];

const GRAD_MINT_L = ['#5FD3A6', '#5CBCF5'];
const GRAD_MINT_D = ['#2FB98A', '#3E8ED8'];
export const GRAD_MINT = [...GRAD_MINT_L];

/** Warna per "rasa" ikon lucu (latar tint + garis + aksen). */
const TINT_L = {
  cash: { bg: '#DEF9EE', fg: '#12A97C', alt: '#7ED9B4' },
  card: { bg: '#E1F3FF', fg: '#1F8FD8', alt: '#8FD3FF' },
  wallet: { bg: '#EDE7FF', fg: '#7350F2', alt: '#C4B2FF' },
  piggy: { bg: '#FFE6EE', fg: '#E8608A', alt: '#FFB3C9' },
  food: { bg: '#FFEBE0', fg: '#E97B4B', alt: '#FFC4A6' },
  car: { bg: '#E1F3FF', fg: '#2E9BE0', alt: '#9BD9FF' },
  bag: { bg: '#EFE9FF', fg: '#7A5AE0', alt: '#C3B0FF' },
  home: { bg: '#FFF3D9', fg: '#D89A28', alt: '#FFDC9A' },
  bolt: { bg: '#FFF3D9', fg: '#E09A2D', alt: '#FFD98E' },
  heart: { bg: '#FFE6EE', fg: '#EF5A8A', alt: '#FFB6CE' },
  gift: { bg: '#EDE7FF', fg: '#8B6BFF', alt: '#CBB9FF' },
  coin: { bg: '#FFF3D9', fg: '#D9941F', alt: '#FFD98E' },
  transfer: { bg: '#EFE9FF', fg: '#6F5BD6', alt: '#BFB0FF' },
  other: { bg: '#F1EAF8', fg: '#8A81A3', alt: '#CFC7DE' },
};

const TINT_D = {
  cash: { bg: '#12332A', fg: '#4FE0AE', alt: '#1E5A48' },
  card: { bg: '#152D3F', fg: '#5CC0F5', alt: '#1F5470' },
  wallet: { bg: '#271F47', fg: '#A98CFF', alt: '#3B2E6B' },
  piggy: { bg: '#3B2030', fg: '#FF8FB1', alt: '#5C3145' },
  food: { bg: '#3B2620', fg: '#FFA981', alt: '#5E3A2E' },
  car: { bg: '#152D3F', fg: '#6CC6FA', alt: '#1F5470' },
  bag: { bg: '#2A2148', fg: '#B49BFF', alt: '#3F3170' },
  home: { bg: '#332A16', fg: '#FFC96B', alt: '#4D3F1F' },
  bolt: { bg: '#332A16', fg: '#F0B44E', alt: '#4D3F1F' },
  heart: { bg: '#3B2030', fg: '#FF8FB1', alt: '#5C3145' },
  gift: { bg: '#271F47', fg: '#A98CFF', alt: '#3B2E6B' },
  coin: { bg: '#332A16', fg: '#FFC96B', alt: '#4D3F1F' },
  transfer: { bg: '#2A2148', fg: '#9B87F0', alt: '#3F3170' },
  other: { bg: '#2A2444', fg: '#A79FC6', alt: '#3A3358' },
};

export const TINT = {};
Object.keys(TINT_L).forEach((k) => {
  TINT[k] = { ...TINT_L[k] };
});

function replace(arr, next) {
  arr.splice(0, arr.length, ...next);
}

/**
 * Ganti palet aktif. Objek publik tetap sama (identity-nya tidak berubah),
 * jadi komponen yang menyimpan referensi `C` tetap ikut berubah.
 * @param {'light'|'dark'} mode
 */
export function applyMode(mode) {
  const dark = mode === 'dark';
  MODE = dark ? 'dark' : 'light';
  Object.assign(C, dark ? DARK : LIGHT);
  Object.assign(shadow, dark ? SHADOW_D : SHADOW_L);
  Object.assign(shadowSoft, dark ? SHADOW_SOFT_D : SHADOW_SOFT_L);
  replace(GRAD, dark ? GRAD_D : GRAD_L);
  replace(GRAD_WARM, dark ? GRAD_WARM_D : GRAD_WARM_L);
  replace(GRAD_MINT, dark ? GRAD_MINT_D : GRAD_MINT_L);
  const tints = dark ? TINT_D : TINT_L;
  Object.keys(tints).forEach((k) => {
    if (!TINT[k]) TINT[k] = { ...tints[k] };
    else Object.assign(TINT[k], tints[k]);
  });
  return MODE;
}

/** true kalau mode gelap sedang aktif. */
export function isDark() {
  return MODE === 'dark';
}

/** Gaya status bar yang cocok dengan mode aktif. */
export function statusBarStyle() {
  return MODE === 'dark' ? 'light' : 'dark';
}
