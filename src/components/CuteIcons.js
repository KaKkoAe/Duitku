import React from 'react';
import { View } from 'react-native';
import { TINT } from '../theme';

/**
 * Ikon lucu berwarna — digambar dari <View> (tanpa font ikon / SVG),
 * jadi tajam di semua platform dan tetap ringan.
 *
 * Tiap "rasa" punya warna pastel sendiri (lihat TINT di theme.js):
 * cash (uang kertas), card (kartu ATM), wallet (e-wallet), piggy (celengan),
 * food (makanan), car (kendaraan), bag (belanja), home (rumah),
 * bolt (tagihan), heart (kesehatan), gift (hadiah), coin, transfer, other.
 */
export const ICON_KINDS = [
  'cash', 'card', 'wallet', 'piggy', 'food', 'car', 'bag', 'home',
  'bolt', 'heart', 'gift', 'coin', 'transfer', 'other',
];

const KIND_WORDS = [
  ['food', ['makan', 'minum', 'kopi', 'warung', 'resto', 'restoran', 'jajan', 'kuliner', 'kafe', 'cafe', 'bakery', 'snack', 'food']],
  ['car', ['transport', 'bensin', 'ojek', 'gojek', 'grab', 'kendaraan', 'motor', 'mobil', 'parkir', 'taksi', 'bus', 'kereta', 'tol', 'travel']],
  ['bag', ['belanja', 'baju', 'pasar', 'toko', 'fashion', 'belanjaan', 'grocer', 'supermarket', 'skincare']],
  ['bolt', ['tagihan', 'listrik', 'air', 'internet', 'pulsa', 'kuota', 'telepon', 'langganan', 'cicilan', 'pajak', 'asuransi']],
  ['home', ['rumah', 'sewa', 'kos', 'kontrakan', 'perabot', 'kebersihan', 'laundry']],
  ['heart', ['sehat', 'dokter', 'obat', 'rumah sakit', 'klinik', 'olahraga', 'gym', 'vitamin']],
  ['piggy', ['tabung', 'investasi', 'saham', 'reksa', 'deposito', 'dana darurat', 'nabung']],
  ['gift', ['hadiah', 'kado', 'donasi', 'sedekah', 'zakat', 'sumbangan', 'ulang tahun']],
  ['cash', ['gaji', 'bonus', 'thr', 'pendapatan', 'pemasukan', 'honor', 'fee', 'komisi', 'tunai', 'cash', 'uang']],
  ['coin', ['lain', 'lainnya', 'other', 'misc', 'hiburan', 'game', 'nonton', 'liburan', 'hobi', 'usaha', 'bisnis', 'dagang', 'jual', 'omzet', 'freelance', 'proyek']],
];

/** Tebak jenis ikon dari teks bebas (nama kategori / dompet). */
export function kindFromText(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return 'other';
  for (const [kind, words] of KIND_WORDS) {
    if (words.some((w) => t.includes(w))) return kind;
  }
  // inisial dompet lama: TU / BC / GO / TR / MA
  if (t === 'tu') return 'cash';
  if (t === 'tr') return 'transfer';
  if (t === 'go') return 'wallet';
  if (t === 'bc' || t === 'ma' || t === 'br') return 'card';
  return 'other';
}

/** Jenis ikon untuk kategori transaksi. */
export function catIconKey(cat) {
  if (!cat) return 'other';
  return kindFromText(`${cat.name || ''} ${cat.id || ''}`);
}

/** Jenis ikon untuk dompet. */
export function walletIconKey(w) {
  if (!w) return 'other';
  if (w.icon && ICON_KINDS.includes(w.icon)) return w.icon;
  const byType = { cash: 'cash', bank: 'card', ewallet: 'wallet', card: 'card' };
  if (byType[w.type]) {
    const byName = kindFromText(w.name);
    // nama khas (GoPay/OVO) tetap e-wallet, nama bank tetap kartu
    if (byName === 'wallet' || byName === 'card') return byName;
    return byType[w.type];
  }
  return kindFromText(w.name);
}

function Glyph({ kind, size, tone }) {
  const u = size / 24;
  const p = (n) => n * u;
  const bw = Math.max(1, 1.7 * u);
  const fg = tone.fg;
  const alt = tone.alt;
  const white = '#FFFFFF';

  const box = (l, t, w, h, bg, extra) => (
    <View
      style={{
        position: 'absolute',
        left: p(l), top: p(t), width: p(w), height: p(h),
        backgroundColor: bg,
        ...extra,
      }}
    />
  );
  const circle = (l, t, d, bg, extra) => box(l, t, d, d, bg, { borderRadius: p(d / 2), ...extra });
  const ring = (l, t, d, extra) => box(l, t, d, d, 'transparent', {
    borderRadius: p(d / 2), borderWidth: bw, borderColor: fg, ...extra,
  });
  const bar = (l, t, w, h, bg, extra) => box(l, t, w, h, bg, { borderRadius: p(Math.min(w, h) / 2), ...extra });

  switch (kind) {
    case 'cash':
      return (
        <>
          {box(2.5, 6, 19, 12, alt, { borderRadius: p(3), borderWidth: bw, borderColor: fg })}
          {circle(9.5, 9.5, 5, fg)}
          {circle(11, 11, 2, alt)}
          {bar(5, 8.6, 2.6, 1.6, fg, { opacity: 0.55 })}
          {bar(16.4, 13.8, 2.6, 1.6, fg, { opacity: 0.55 })}
        </>
      );
    case 'card':
      return (
        <>
          {box(2, 5.5, 20, 13, alt, { borderRadius: p(3.2), borderWidth: bw, borderColor: fg })}
          {bar(2, 8.4, 20, 3.2, fg, { borderRadius: 0 })}
          {bar(5, 13.2, 4.4, 3, fg, { opacity: 0.6, borderRadius: p(1) })}
          {bar(11.4, 14.2, 7, 1.4, fg, { opacity: 0.45 })}
        </>
      );
    case 'wallet':
      return (
        <>
          {box(3, 6.5, 17, 13, alt, { borderRadius: p(3.4), borderWidth: bw, borderColor: fg })}
          {bar(3, 6.5, 17, 4.4, fg, { borderRadius: p(3.4) })}
          {circle(12.4, 2.4, 5.6, '#FFD98E', { borderWidth: bw, borderColor: fg })}
          {circle(14.2, 4.2, 1.8, fg)}
          {bar(14.6, 12.4, 5.4, 2.2, fg, { opacity: 0.55 })}
        </>
      );
    case 'piggy':
      return (
        <>
          {circle(3.2, 7, 16.6, alt, { borderRadius: p(8.3), borderWidth: bw, borderColor: fg })}
          {circle(5.4, 4.2, 4.6, alt, { borderWidth: bw, borderColor: fg })}
          {bar(8.6, 5.4, 6.4, 1.7, fg, { transform: [{ rotate: '-14deg' }] })}
          {box(14.6, 11, 5.4, 4.4, fg, { borderRadius: p(2) })}
          {circle(16, 12.4, 1.3, alt)}
          {circle(18.1, 12.4, 1.3, alt)}
          {bar(6, 20.2, 2.8, 3, fg, { borderRadius: p(1) })}
          {bar(14, 20.2, 2.8, 3, fg, { borderRadius: p(1) })}
          {circle(2, 11, 2.6, alt, { borderWidth: bw, borderColor: fg })}
        </>
      );
    case 'food':
      return (
        <>
          <View style={{ position: 'absolute', left: p(4), top: p(10.5), width: p(16), height: p(7), overflow: 'hidden' }}>
            {circle(0, 0, 16, alt, { borderRadius: p(8), borderWidth: bw, borderColor: fg })}
          </View>
          {bar(2.6, 17.4, 18.8, 2.2, fg, { opacity: 0.35 })}
          {circle(7.6, 5.4, 8.6, fg, { opacity: 0.85 })}
          {circle(9.8, 3.4, 3.4, fg)}
          {bar(4.2, 2.2, 1.6, 4.4, fg, { opacity: 0.35, transform: [{ rotate: '-18deg' }] })}
          {bar(9, 0.8, 1.6, 4.4, fg, { opacity: 0.35, transform: [{ rotate: '-18deg' }] })}
          {bar(13.8, 2.2, 1.6, 4.4, fg, { opacity: 0.35, transform: [{ rotate: '-18deg' }] })}
        </>
      );
    case 'car':
      return (
        <>
          {box(5.6, 5.4, 12.4, 7.6, alt, { borderRadius: p(3.4), borderWidth: bw, borderColor: fg })}
          {box(2.6, 10.6, 18.8, 7, alt, { borderRadius: p(3.4), borderWidth: bw, borderColor: fg })}
          {box(8.4, 7.4, 6.8, 3.6, fg, { opacity: 0.28, borderRadius: p(1.4) })}
          {circle(5.4, 15.4, 4.6, fg, { borderWidth: bw, borderColor: alt })}
          {circle(14, 15.4, 4.6, fg, { borderWidth: bw, borderColor: alt })}
          {bar(16.6, 12.2, 3, 1.6, '#FFD98E')}
        </>
      );
    case 'bag':
      return (
        <>
          <View style={{ position: 'absolute', left: p(7.4), top: p(3), width: p(9.2), height: p(5.4), overflow: 'hidden' }}>
            {ring(0, 0, 9.2, { borderWidth: bw })}
          </View>
          {box(4.4, 8.6, 15.2, 12.4, alt, { borderRadius: p(3.2), borderWidth: bw, borderColor: fg })}
          {circle(8.6, 12.4, 1.9, fg)}
          {circle(13.6, 12.4, 1.9, fg)}
          {bar(9.6, 16.4, 4.8, 1.6, fg, { opacity: 0.45 })}
        </>
      );
    case 'home':
      return (
        <>
          <View
            style={{
              position: 'absolute', left: p(2.4), top: p(2.2),
              width: 0, height: 0,
              borderLeftWidth: p(9.6), borderRightWidth: p(9.6), borderBottomWidth: p(8.4),
              borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: fg,
            }}
          />
          {box(5, 10.6, 14, 10.4, alt, { borderRadius: p(2.4), borderWidth: bw, borderColor: fg })}
          {box(9.8, 14.4, 4.4, 6.6, fg, { borderRadius: p(1.6) })}
          {circle(13.4, 12.2, 1.8, fg, { opacity: 0.5 })}
        </>
      );
    case 'bolt':
      // struk tagihan
      return (
        <>
          {box(5.6, 2.6, 12.8, 18.4, alt, { borderRadius: p(2.6), borderWidth: bw, borderColor: fg })}
          {bar(8, 6, 8, 1.7, fg, { opacity: 0.75 })}
          {bar(8, 9.4, 8, 1.7, fg, { opacity: 0.45 })}
          {bar(8, 12.8, 5.4, 1.7, fg, { opacity: 0.45 })}
          {circle(13.6, 15.4, 3.6, fg, { opacity: 0.85 })}
        </>
      );
    case 'heart':
      return (
        <>
          {circle(4.2, 5.2, 8, fg)}
          {circle(11.8, 5.2, 8, fg)}
          {box(6.4, 8.6, 11.2, 8.4, fg, { transform: [{ rotate: '45deg' }], borderRadius: p(1) })}
          {circle(8.4, 7.4, 2.2, white, { opacity: 0.45 })}
        </>
      );
    case 'gift':
      return (
        <>
          {box(4.4, 10.4, 15.2, 10.4, alt, { borderRadius: p(2.4), borderWidth: bw, borderColor: fg })}
          {bar(3, 7.6, 18, 3.6, fg, { borderRadius: p(1.4) })}
          {bar(10.8, 10.4, 2.4, 10.4, fg, { borderRadius: 0 })}
          {circle(7.4, 4.2, 4.4, fg, { borderWidth: bw, borderColor: alt })}
          {circle(12.6, 4.2, 4.4, fg, { borderWidth: bw, borderColor: alt })}
        </>
      );
    case 'coin':
      return (
        <>
          {circle(3.4, 3.4, 17.2, alt, { borderWidth: bw, borderColor: fg })}
          {ring(7.2, 7.2, 9.6, { borderWidth: bw, opacity: 0.8 })}
          {bar(9.4, 11, 5.2, 1.8, fg, { opacity: 0.7 })}
        </>
      );
    case 'transfer':
      return (
        <>
          {bar(4, 7.4, 11, 2.6, fg)}
          <View
            style={{
              position: 'absolute', left: p(14.4), top: p(5.6),
              width: 0, height: 0,
              borderTopWidth: p(3.2), borderBottomWidth: p(3.2), borderLeftWidth: p(3.8),
              borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: fg,
            }}
          />
          {bar(9, 15.4, 11, 2.6, fg, { opacity: 0.55 })}
          <View
            style={{
              position: 'absolute', left: p(5.8), top: p(13.6),
              width: 0, height: 0,
              borderTopWidth: p(3.2), borderBottomWidth: p(3.2), borderRightWidth: p(3.8),
              borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: fg,
              opacity: 0.55,
            }}
          />
        </>
      );
    default:
      return (
        <>
          {circle(3.4, 10, 4.4, fg, { opacity: 0.85 })}
          {circle(9.8, 10, 4.4, fg, { opacity: 0.55 })}
          {circle(16.2, 10, 4.4, fg, { opacity: 0.3 })}
        </>
      );
  }
}

/** Ikon lucu di dalam kotak pastel membulat. */
export function CuteIcon({ kind = 'other', size = 40, style }) {
  const tone = TINT[kind] || TINT.other;
  const inner = size * 0.62;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.34,
          backgroundColor: tone.bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View style={{ width: inner, height: inner }}>
        <Glyph kind={kind} size={inner} tone={tone} />
      </View>
    </View>
  );
}

export default CuteIcon;
